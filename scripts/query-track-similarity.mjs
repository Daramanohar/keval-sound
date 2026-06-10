import { withClient } from "./lib/db.mjs";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embedTexts,
  getEmbeddingConfig,
  vectorToSql,
} from "./lib/embeddings.mjs";

const queries = process.argv.slice(2);
const TEST_QUERIES = queries.length
  ? queries
  : [
      "cinematic trailer for mountain scene",
      "lo-fi study beat with soft piano",
      "wedding video romantic music",
      "dark drill beat",
    ];

async function search(client, query, config) {
  const model = config.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;
  const [vector] = await embedTexts([query], config);

  if (!vector || vector.length !== dimensions) {
    throw new Error(`Invalid query embedding dimension: expected ${dimensions}, got ${vector?.length ?? 0}`);
  }

  const result = await client.query(
    `
      select
        id,
        title,
        pack_id,
        category,
        1 - (embedding <=> $1::vector) as similarity,
        tags
      from tracks
      where embedding is not null
        and embedding_model = $2
        and embedding_dimensions = $3
      order by embedding <=> $1::vector
      limit 10
    `,
    [vectorToSql(vector), model, dimensions]
  );

  return result.rows;
}

async function main() {
  const config = getEmbeddingConfig();
  await withClient(async (client) => {
    for (const query of TEST_QUERIES) {
      const rows = await search(client, query, config);
      console.log(`\nQUERY: ${query}`);
      console.table(
        rows.map((row) => ({
          similarity: Number(row.similarity).toFixed(4),
          title: row.title,
          pack: row.pack_id,
          category: row.category,
          tags: Array.isArray(row.tags) ? row.tags.slice(0, 3).join(", ") : "",
        }))
      );
    }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
