import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const configuredPoolSize = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "3", 10);
  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
      max: Number.isFinite(configuredPoolSize) && configuredPoolSize > 0 ? configuredPoolSize : 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // A Vercel function instance can serve more than one request. Reusing one
  // pool per instance prevents connection storms against Neon.
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;

  return prisma;
}
