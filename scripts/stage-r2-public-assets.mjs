import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const GENERATED_CATALOG = path.join(PROJECT_ROOT, "src", "lib", "production-catalog.generated.ts");
const STAGING_ROOT = path.join(PROJECT_ROOT, "output", "r2-public");
const PUBLIC_MARKER = "/public/";

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${parent}: ${child}`);
  }
}

function normalizeObjectPath(url, section) {
  const marker = `${PUBLIC_MARKER}${section}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Cannot derive public/${section} object path from URL: ${url}`);
  }

  return url.slice(markerIndex + PUBLIC_MARKER.length).replace(/\//g, path.sep);
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

async function linkOrCopy(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rm(target, { force: true });

  try {
    await fs.link(source, target);
  } catch {
    await fs.copyFile(source, target);
  }
}

async function main() {
  const stagingRoot = path.resolve(STAGING_ROOT);
  const outputRoot = path.resolve(PROJECT_ROOT, "output");
  assertInside(outputRoot, stagingRoot);

  await fs.rm(stagingRoot, { recursive: true, force: true });
  await fs.mkdir(stagingRoot, { recursive: true });

  const records = await readCatalogRecords();
  const missing = [];
  let mp3Count = 0;
  let lyricsCount = 0;

  for (const record of records) {
    const sourceDir = path.resolve(PROJECT_ROOT, record.sourcePath);
    const mp3 = await firstMatchingFile(sourceDir, (name) => name.toLowerCase().endsWith(".mp3"));

    if (record.hasMp3 && mp3) {
      const target = path.join(stagingRoot, normalizeObjectPath(record.mp3Url, "mp3"));
      assertInside(stagingRoot, target);
      await linkOrCopy(mp3, target);
      mp3Count += 1;
    } else if (record.hasMp3) {
      missing.push({ type: "mp3", sourcePath: record.sourcePath });
    }

    if (record.lyricsUrl) {
      const lyrics = await firstMatchingFile(
        sourceDir,
        (name) => /lyrics/i.test(name) && name.toLowerCase().endsWith(".txt")
      );

      if (lyrics) {
        const target = path.join(stagingRoot, normalizeObjectPath(record.lyricsUrl, "lyrics"));
        assertInside(stagingRoot, target);
        await linkOrCopy(lyrics, target);
        lyricsCount += 1;
      } else {
        missing.push({ type: "lyrics", sourcePath: record.sourcePath });
      }
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    stagingRoot,
    records: records.length,
    mp3Count,
    lyricsCount,
    missing,
  };

  await fs.writeFile(
    path.join(stagingRoot, "upload-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`Staged ${mp3Count} MP3 files and ${lyricsCount} lyrics files in ${path.relative(PROJECT_ROOT, stagingRoot)}`);
  if (missing.length) {
    console.log(`Missing referenced files: ${missing.length}`);
    console.log(JSON.stringify(missing.slice(0, 20), null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
