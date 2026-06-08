import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://keval:keval@localhost:5432/keval_sound",
  },
});
