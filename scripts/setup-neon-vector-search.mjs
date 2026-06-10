import { withClient } from "./lib/db.mjs";

async function main() {
  await withClient(async (client) => {
    await client.query("create extension if not exists vector");

    await client.query(`
      alter table tracks
        add column if not exists metadata_hash text,
        add column if not exists embedding_model text,
        add column if not exists embedding_dimensions integer,
        add column if not exists embedding vector(1024)
    `);

    await client.query(`
      create index if not exists tracks_embedding_hnsw_idx
        on tracks using hnsw (embedding vector_cosine_ops)
    `);

    await client.query(`
      create index if not exists tracks_pack_title_idx
        on tracks (pack_id, title)
    `);
  });

  console.log("Neon vector search schema is ready: pgvector, embedding columns, HNSW index.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
