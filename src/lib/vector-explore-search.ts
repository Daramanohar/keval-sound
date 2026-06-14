import pg from "pg";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embedTexts,
  getEmbeddingConfig,
  isEmbeddingProviderConfigured,
  vectorToSql,
} from "@/lib/embedding-provider";
import { createSearchAcknowledgement, optimizeSearchPrompt } from "@/lib/search-intent";
import {
  diversifyRecordsAcrossPacks,
  getExploreCategories,
  getExploreGenres,
  matchesExploreFilter,
  recordToExploreTrack,
  searchExploreTracks,
  type ExploreSearchResponse,
} from "@/lib/explore-search";
import { productionSongRecords, type ProductionSongRecord } from "@/lib/production-catalog.generated";
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
  vectorReason?: string,
  originalQuery = response.query,
  optimizedQuery = response.query
): VectorSearchResponse {
  return {
    ...response,
    query: originalQuery,
    originalQuery,
    optimizedQuery: optimizedQuery !== originalQuery ? optimizedQuery : undefined,
    acknowledgement: createSearchAcknowledgement(originalQuery, response.total, vectorReady),
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
  limit: number
) {
  const pool = getVectorSearchPool();
  const result = await pool.query<VectorRow>(
    `
      select
        tracks.id,
        1 - (tracks.embedding <=> $1::vector) as similarity
      from tracks
      where tracks.embedding is not null
        and tracks.embedding_model = $2
        and tracks.embedding_dimensions = $3
        and tracks.has_mp3 = true
      order by tracks.embedding <=> $1::vector
      limit $4
    `,
    [vectorToSql(queryVector), model, dimensions, limit]
  );

  return result.rows;
}

export async function searchExploreTracksSmart(query: string, genre = "All Genres", limit = 160) {
  const originalQuery = query.trim();
  const optimizedQuery = originalQuery ? optimizeSearchPrompt(originalQuery) : "";
  const searchQuery = optimizedQuery || originalQuery;
  const fallback = (vectorReason?: string, vectorReady = false) =>
    withSearchMode(
      searchExploreTracks(searchQuery, genre, limit),
      "metadata",
      vectorReady,
      vectorReason,
      originalQuery,
      searchQuery
    );

  if (!originalQuery) {
    return fallback();
  }

  const config = getEmbeddingConfig();
  const model = config.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;

  if (!isEmbeddingProviderConfigured(config)) {
    return fallback("embedding_provider_not_configured");
  }

  if (!(await hasUsableEmbeddings(model, dimensions))) {
    return fallback("track_embeddings_not_ready");
  }

  try {
    const [queryVector] = await embedTexts([searchQuery], config);
    if (!queryVector || queryVector.length !== dimensions) {
      return fallback("invalid_query_embedding");
    }

    const metadataCandidateLimit = Math.min(Math.max(limit * 2, 240), 500);
    const vectorCandidateLimit = Math.min(Math.max(limit * 4, 480), 1000);
    const rows = await querySimilarTrackIds(queryVector, model, dimensions, vectorCandidateLimit);
    const metadataCandidates = searchExploreTracks(searchQuery, genre, metadataCandidateLimit);
    const recordsById = new Map<string, ProductionSongRecord>(
      productionSongRecords.map((record) => [record.id, record as ProductionSongRecord])
    );
    const seenIds = new Set<string>();
    let orderedIds = [
      ...metadataCandidates.tracks.map((track) => track.id),
      ...rows.map((row) => row.id),
    ].filter((id) => {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
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

      const rerankedDocuments = await rerankDocuments(searchQuery, documents);
      orderedIds = rerankedDocuments.map((document) => document.id);
      reranked = true;
    }

    const orderedRecords = orderedIds
      .map((id) => recordsById.get(id))
      .filter((record): record is ProductionSongRecord => Boolean(record))
      .filter((record) => matchesExploreFilter(record, genre));
    const diversifiedRecords = diversifyRecordsAcrossPacks(orderedRecords, limit);
    const tracks = diversifiedRecords.map((record, index) => recordToExploreTrack(record, index));

    if (!tracks.length) {
      return withSearchMode(
        searchExploreTracks(searchQuery, genre, limit),
        "metadata",
        true,
        "vector_search_returned_no_tracks",
        originalQuery,
        searchQuery
      );
    }

    return {
      query: originalQuery,
      originalQuery,
      optimizedQuery: searchQuery !== originalQuery ? searchQuery : undefined,
      acknowledgement: createSearchAcknowledgement(originalQuery, tracks.length, true),
      genre: genre === "All" ? "All Genres" : genre,
      total: Math.max(metadataCandidates.total, orderedRecords.length),
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
    return fallback("vector_search_failed");
  }
}
