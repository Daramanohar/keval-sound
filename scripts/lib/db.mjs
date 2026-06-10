import pg from "pg";
import { loadLocalEnv, requireEnv } from "./env.mjs";

const { Pool } = pg;

export function createPool() {
  loadLocalEnv();
  return new Pool({
    connectionString: requireEnv("DATABASE_URL"),
  });
}

export async function withClient(callback) {
  const pool = createPool();
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
    await pool.end();
  }
}
