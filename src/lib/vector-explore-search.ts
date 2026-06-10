import pg from "pg";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embedTexts,
  getEmbeddingConfig,
  isEmbeddingProviderConfigured,
  vectorToSql,
} from "@/lib/embedding-provider";
import {
  getExploreCategories,
  getExploreGenres,
  recordToExploreTrack,
  searchExploreTracks,
  type ExploreSearchResponse,
} from "@/lib/explore-search";
import { productionSongRecords } from "@/lib/production-catalog.generated";
import { isRerankerConfigured, rerankDocuments } from "@/lib/reranker-provider";

const { Pool } = pg;

type VectorSearchResponse = ExploreSearchResponse & {
  searchMode: "metadata" | "vector";
  vectorReady: boolean;
  reranked?: boolean;
  vectorReason?: string;
};

type VectorRow = {
  id: string;
  similarity: number;
};

const globalForVectorSearch = globalThis as unknown as {
  vectorSearchPool?: pg.Pool;
};

function getVectorSearchPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = globalForVectorSearch.vectorSearchPool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForVectorSearch.vectorSearchPool = pool;
  }

  return pool;
}

function withSearchMode(
  response: ExploreSearchResponse,
  searchMode: VectorSearchResponse["searchMode"],
  vectorReady: boolean,
  vectorReason?: string
): VectorSearchResponse {
  return {
    ...response,
    searchMode,
    vectorReady,
    ...(vectorReason ? { vectorReason } : {}),
  };
}

async function hasUsableEmbeddings(model: string, dimensions: number) {
  const pool = getVectorSearchPool();
  const result = await pool.query<{ count: number }>(
    `
      select count(*)::int as count
      from tracks
      where embedding is not null
        and embedding_model = $1
        and embedding_dimensions = $2
    `,
    [model, dimensions]
  );

  return (result.rows[0]?.count ?? 0) > 0;
}

async function querySimilarTrackIds(
  queryVector: number[],
  model: string,
  dimensions: number,
  genre: string,
  limit: number
) {
  const pool = getVectorSearchPool();
  const normalizedGenre = genre === "All" ? "All Genres" : genre;
  const genreFilter = normalizedGenre === "All Genres" ? null : normalizedGenre;
  const result = await pool.query<VectorRow>(
    `
      select
        tracks.id,
        1 - (tracks.embedding <=> $1::vector) as similarity
      from tracks
      join music_packs on music_packs.id = tracks.pack_id
      where tracks.embedding is not null
        and tracks.embedding_model = $2
        and tracks.embedding_dimensions = $3
        and tracks.has_mp3 = true
        and ($4::text is null or music_packs.title = $4)
      order by tracks.embedding <=> $1::vector
      limit $5
    `,
    [vectorToSql(queryVector), model, dimensions, genreFilter, limit]
  );

  return result.rows;
}

export async function searchExploreTracksSmart(query: string, genre = "All Genres", limit = 160) {
  const cleanQuery = query.trim();
  const fallback = () => withSearchMode(searchExploreTracks(query, genre, limit), "metadata", false);

  if (!cleanQuery) {
    return fallback();
  }

  const config = getEmbeddingConfig();
  const model = config.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;

  if (!isEmbeddingProviderConfigured(config)) {
    return withSearchMode(
      searchExploreTracks(query, genre, limit),
      "metadata",
      false,
      "embedding_provider_not_configured"
    );
  }

  if (!(await hasUsableEmbeddings(model, dimensions))) {
    return withSearchMode(
      searchExploreTracks(query, genre, limit),
      "metadata",
      false,
      "track_embeddings_not_ready"
    );
  }

  try {
    const [queryVector] = await embedTexts([cleanQuery], config);
    if (!queryVector || queryVector.length !== dimensions) {
      return withSearchMode(
        searchExploreTracks(query, genre, limit),
        "metadata",
        false,
        "invalid_query_embedding"
      );
    }

    const rows = await querySimilarTrackIds(queryVector, model, dimensions, genre, limit);
    const recordsById = new Map(productionSongRecords.map((record) => [record.id, record]));
    let orderedIds = rows.map((row) => row.id);
    let reranked = false;

    if (isRerankerConfigured() && orderedIds.length > 1) {
      const documents = orderedIds
        .map((id) => {
          const record = recordsById.get(id);
          if (!record) return null;

          return {
            id,
            text: [
              record.title,
              record.packTitle,
              record.category,
              record.sourceCategory,
              record.tags.join(", "),
              record.metadataText,
            ].join("\n"),
          };
        })
        .filter((document) => document !== null);

      const rerankedDocuments = await rerankDocuments(cleanQuery, documents);
      orderedIds = rerankedDocuments.map((document) => document.id);
      reranked = true;
    }

    const tracks = orderedIds
      .map((id, index) => {
        const record = recordsById.get(id);
        return record ? recordToExploreTrack(record, index) : null;
      })
      .filter((track) => track !== null);

    if (!tracks.length) {
      return withSearchMode(
        searchExploreTracks(query, genre, limit),
        "metadata",
        true,
        "vector_search_returned_no_tracks"
      );
    }

    return {
      query: cleanQuery,
      genre: genre === "All" ? "All Genres" : genre,
      total: tracks.length,
      limit,
      tracks,
      genres: getExploreGenres(),
      categories: getExploreCategories(),
      searchMode: "vector",
      vectorReady: true,
      reranked,
    } satisfies VectorSearchResponse;
  } catch (error) {
    console.error("Vector search failed, falling back to metadata search", error);
    return withSearchMode(
      searchExploreTracks(query, genre, limit),
      "metadata",
      false,
      "vector_search_failed"
    );
  }
}
