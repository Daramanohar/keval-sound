import { createMetadataHash } from "./lib/catalog.mjs";
import { withClient } from "./lib/db.mjs";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embedTexts,
  getEmbeddingConfig,
  vectorToSql,
} from "./lib/embeddings.mjs";

const BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 8);
const LIMIT = Number(process.env.EMBEDDING_LIMIT || 0);

async function fetchPendingTracks(client, model, dimensions, limit) {
  const result = await client.query(
    `
      select id, search_text, metadata_hash
      from tracks
      where search_text is not null
        and (
          embedding is null
          or embedding_model is distinct from $1
          or embedding_dimensions is distinct from $2
        )
      order by updated_at desc, id asc
      ${limit > 0 ? `limit ${Math.trunc(limit)}` : ""}
    `,
    [model, dimensions]
  );

  return result.rows;
}

async function updateEmbeddingBatch(client, rows) {
  if (!rows.length) return;

  await client.query(
    `
      with incoming as (
        select *
        from jsonb_to_recordset($1::jsonb) as embedding_rows(
          id text,
          embedding text,
          embedding_model text,
          embedding_dimensions integer,
          metadata_hash text
        )
      )
      update tracks
      set
        embedding = incoming.embedding::vector,
        embedding_model = incoming.embedding_model,
        embedding_dimensions = incoming.embedding_dimensions,
        metadata_hash = coalesce(tracks.metadata_hash, incoming.metadata_hash),
        updated_at = now()
      from incoming
      where tracks.id = incoming.id
    `,
    [JSON.stringify(rows)]
  );
}

async function main() {
  const config = getEmbeddingConfig();
  const model = config.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;

  const tracks = await withClient((client) => fetchPendingTracks(client, model, dimensions, LIMIT));
  console.log(`Pending embeddings: ${tracks.length}`);
  if (!tracks.length) return;

  let embedded = 0;

  for (let index = 0; index < tracks.length; index += BATCH_SIZE) {
    const batch = tracks.slice(index, index + BATCH_SIZE);
    const texts = batch.map((track) => track.search_text);
    const vectors = await embedTexts(texts, config);

    if (vectors.length !== batch.length) {
      throw new Error(`Embedding provider returned ${vectors.length} vectors for ${batch.length} inputs`);
    }

    const rows = batch.map((track, itemIndex) => {
      const vector = vectors[itemIndex];
      if (!vector || vector.length !== dimensions) {
        throw new Error(
          `Invalid embedding dimension for ${track.id}: expected ${dimensions}, got ${vector?.length ?? 0}`
        );
      }

      return {
        id: track.id,
        embedding: vectorToSql(vector),
        embedding_model: model,
        embedding_dimensions: dimensions,
        metadata_hash: track.metadata_hash ?? createMetadataHash(track.search_text),
      };
    });

    await withClient((client) => updateEmbeddingBatch(client, rows));
    embedded += batch.length;
    console.log(`Embedded ${embedded}/${tracks.length}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
