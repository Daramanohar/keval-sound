import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const PROJECT_ROOT = process.cwd();
export const GENERATED_CATALOG = path.join(
  PROJECT_ROOT,
  "src",
  "lib",
  "production-catalog.generated.ts"
);

export async function readCatalogRecords() {
  const source = await fs.readFile(GENERATED_CATALOG, "utf8");
  const match = source.match(/export const productionSongRecords = ([\s\S]*?) satisfies ProductionSongRecord\[];/);
  if (!match) {
    throw new Error(`Could not parse production records from ${GENERATED_CATALOG}`);
  }

  return JSON.parse(match[1]);
}

export function createSearchDocument(record) {
  return [
    `Title: ${record.title}`,
    `Pack: ${record.packTitle}`,
    `Category: ${record.category}`,
    `Source category: ${record.sourceCategory}`,
    `Tags: ${(record.tags ?? []).join(", ")}`,
    `Instrumental: ${record.isInstrumental ? "yes" : "no"}`,
    `Lyrics available: ${record.hasLyrics ? "yes" : "no"}`,
    "",
    record.metadataText ?? "",
  ]
    .join("\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function createMetadataHash(searchDocument) {
  return crypto.createHash("sha256").update(searchDocument).digest("hex");
}

export function groupPacks(records) {
  const packs = new Map();

  for (const record of records) {
    const current = packs.get(record.packId) ?? {
      id: record.packId,
      title: record.packTitle,
      category: record.category,
      coverUrl: record.coverUrl,
      trackCount: 0,
      totalDuration: 0,
    };

    current.trackCount += 1;
    current.totalDuration += record.durationSeconds ?? 0;
    packs.set(record.packId, current);
  }

  return Array.from(packs.values());
}
