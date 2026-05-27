import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const GENERATED_CATALOG = path.join(PROJECT_ROOT, "src", "lib", "production-catalog.generated.ts");
const STAGING_ROOT = path.join(PROJECT_ROOT, "output", "r2-private");
const PRIVATE_WAV_PREFIX = "private/wav/";

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${parent}: ${child}`);
  }
}

function normalizeWavObjectPath(wavPath) {
  if (!wavPath.startsWith(PRIVATE_WAV_PREFIX)) {
    throw new Error(`Cannot derive private WAV object path from catalog path: ${wavPath}`);
  }

  return wavPath.slice(PRIVATE_WAV_PREFIX.length).replace(/\//g, path.sep);
}

async function readCatalogRecords() {
  const source = await fs.readFile(GENERATED_CATALOG, "utf8");
  const match = source.match(/export const productionSongRecords = ([\s\S]*?) satisfies ProductionSongRecord\[];/);
  if (!match) {
    throw new Error(`Could not parse production records from ${GENERATED_CATALOG}`);
  }

  return JSON.parse(match[1]);
}

async function firstMatchingFile(dir, predicate) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const match = entries.find((entry) => entry.isFile() && predicate(entry.name));
  return match ? path.join(dir, match.name) : null;
}

async function fileSize(target) {
  const stat = await fs.stat(target);
  return stat.size;
}

async function hardLink(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rm(target, { force: true });

  try {
    await fs.link(source, target);
  } catch (error) {
    throw new Error(
      [
        `Could not hard-link WAV staging file.`,
        `Source: ${source}`,
        `Target: ${target}`,
        `Original error: ${error.message}`,
        `The script intentionally avoids copying WAV bytes because the library is large.`,
      ].join("\n")
    );
  }
}

async function main() {
  const stagingRoot = path.resolve(STAGING_ROOT);
  const outputRoot = path.resolve(PROJECT_ROOT, "output");
  assertInside(outputRoot, stagingRoot);

  await fs.rm(stagingRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(stagingRoot, "wav"), { recursive: true });

  const records = await readCatalogRecords();
  const missing = [];
  let wavCount = 0;
  let totalBytes = 0;

  for (const record of records) {
    if (!record.hasWav) {
      missing.push({ id: record.id, title: record.title, sourcePath: record.sourcePath, reason: "catalog_has_no_wav" });
      continue;
    }

    const sourceDir = path.resolve(PROJECT_ROOT, record.sourcePath);
    const wav = await firstMatchingFile(sourceDir, (name) => name.toLowerCase().endsWith(".wav"));

    if (!wav) {
      missing.push({ id: record.id, title: record.title, sourcePath: record.sourcePath, reason: "wav_file_not_found" });
      continue;
    }

    const target = path.join(stagingRoot, "wav", normalizeWavObjectPath(record.wavPath));
    assertInside(stagingRoot, target);
    await hardLink(wav, target);
    wavCount += 1;
    totalBytes += await fileSize(wav);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    stagingRoot,
    records: records.length,
    wavCount,
    totalBytes,
    totalGiB: Number((totalBytes / 1024 ** 3).toFixed(3)),
    missing,
  };

  await fs.writeFile(
    path.join(stagingRoot, "upload-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`Staged ${wavCount} WAV files (${manifest.totalGiB} GiB) in ${path.relative(PROJECT_ROOT, stagingRoot)}`);
  if (missing.length) {
    console.log(`Missing WAV references: ${missing.length}`);
    console.log(JSON.stringify(missing.slice(0, 20), null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
