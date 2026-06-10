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

async function main() {
  const config = getEmbeddingConfig();
  const model = config.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;

  await withClient(async (client) => {
    const tracks = await fetchPendingTracks(client, model, dimensions, LIMIT);
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

      for (let itemIndex = 0; itemIndex < batch.length; itemIndex += 1) {
        const track = batch[itemIndex];
        const vector = vectors[itemIndex];
        if (!vector || vector.length !== dimensions) {
          throw new Error(
            `Invalid embedding dimension for ${track.id}: expected ${dimensions}, got ${vector?.length ?? 0}`
          );
        }

        await client.query(
          `
            update tracks
            set
              embedding = $1::vector,
              embedding_model = $2,
              embedding_dimensions = $3,
              metadata_hash = coalesce(metadata_hash, $4),
              updated_at = now()
            where id = $5
          `,
          [
            vectorToSql(vector),
            model,
            dimensions,
            track.metadata_hash ?? createMetadataHash(track.search_text),
            track.id,
          ]
        );
        embedded += 1;
      }

      console.log(`Embedded ${embedded}/${tracks.length}`);
    }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
