import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const SOURCE_ROOT = path.join(PROJECT_ROOT, "keval-packs", "SOUND PACKS(Main Version)");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "src", "lib", "production-catalog.generated.ts");
const HOME_OUTPUT_FILE = path.join(PROJECT_ROOT, "src", "lib", "production-home.generated.ts");
const PUBLIC_CDN_BASE = "https://cdn.kevalsound.com";
const KEY_ROTATION = ["Am", "C", "Em", "G", "Dm", "F", "Bbm", "D"];

const PACKS = [
  [1, "Pop", "Commercial"],
  [2, "Hip-Hop / Rap", "Commercial"],
  [3, "R&B", "Commercial"],
  [4, "Rock", "Commercial"],
  [5, "Latin", "Culture"],
  [6, "Country", "Culture"],
  [7, "EDM / Dance", "Electronic"],
  [8, "K-Pop", "Culture"],
  [9, "Reggae", "Culture"],
  [10, "Swing", "Electronic"],
  [11, "Trap", "Electronic"],
  [12, "Alternative Rock", "Indie"],
  [13, "Indie Pop", "Indie"],
  [14, "Pop Rock", "Commercial"],
  [15, "House", "Electronic"],
  [16, "Techno", "Electronic"],
  [17, "Metal", "Commercial"],
  [18, "Pop Punk", "Commercial"],
  [19, "Folk", "Indie"],
  [20, "Soul", "Indie"],
  [21, "Gospel", "Indie"],
  [22, "Jazz", "Indie"],
  [23, "Classical", "Classic"],
  [24, "Hindi Electronic", "Bollywood"],
  [25, "Hindi Romance", "Bollywood"],
  [26, "Hindi Rock", "Bollywood"],
  [27, "Hindi Dance", "Bollywood"],
  [28, "Hindi Pop", "Bollywood"],
  [29, "Hindi Hip-Hop", "Bollywood"],
  [30, "Hindi Fusion", "Bollywood"],
  [31, "Hindi Vintage", "Bollywood"],
  [32, "Hindi Swing", "Bollywood"],
  [33, "Hindi Epic", "Bollywood"],
  [34, "Japanese / J-Pop", "Culture"],
  [35, "Anime", "Culture"],
  [36, "Chinese / C-Pop", "Culture"],
  [37, "Acoustic", "Commercial"],
  [38, "Polish", "Culture"],
  [39, "Brazilian Funk", "Culture"],
  [40, "Lo-Fi", "Electronic"],
  [41, "Ambient", "Electronic"],
  [42, "Blues", "Indie"],
  [43, "Hard Rock", "Commercial"],
  [44, "Drum & Bass", "Electronic"],
  [45, "Dubstep", "Electronic"],
  [46, "Trance", "Electronic"],
  [47, "Afro House", "Electronic"],
  [48, "Phonk", "Electronic"],
  [49, "Hyperpop", "Electronic"],
  [50, "Tech House", "Electronic"],
  [51, "Gaming & Streaming", "Occasion"],
  [52, "Meditation & Yoga", "Occasion"],
  [53, "Content Creator", "Occasion"],
  [54, "Fitness & Workout", "Occasion"],
  [55, "Podcast & Interview", "Occasion"],
  [56, "Travel & Adventure", "Occasion"],
  [57, "Corporate & Presentation", "Occasion"],
  [58, "Lifestyle & Food", "Occasion"],
  [59, "Weddings & Events", "Occasion"],
  [60, "Study & Productivity", "Occasion"],
  [61, "420 Sesh", "Occasion"],
  [62, "Movies & OSTs", "Occasion"],
  [63, "Love", "Occasion"],
  [64, "Trippy", "Occasion"],
];

const PACK_BY_KEY = new Map(
  PACKS.flatMap(([n, title, category]) => {
    const meta = { id: `pack-${n}`, title, category, coverUrl: `/packs/pack-${n}.png` };
    return [
      [normalizeKey(String(title)), meta],
      [normalizeKey(String(title).replace(/\s*\/\s*/g, " ")), meta],
      [normalizeKey(String(title).replace(/\s*&\s*/g, " and ")), meta],
    ];
  })
);

const PACK_ALIASES = {
  "brazilian": "Brazilian Funk",
  "chinese": "Chinese / C-Pop",
  "japanese": "Japanese / J-Pop",
  "korean": "K-Pop",
  "edm dance": "EDM / Dance",
  "content creator background music": "Content Creator",
  "trippy": "Trippy",
};

for (const [alias, title] of Object.entries(PACK_ALIASES)) {
  const packMeta = PACK_BY_KEY.get(normalizeKey(title));
  if (packMeta) PACK_BY_KEY.set(alias, packMeta);
}

PACK_BY_KEY.set("middle east", {
  id: "external-middle-east",
  title: "Middle East",
  category: "Culture",
  coverUrl: "/packs/middle-east.jpeg",
});

function normalizeQuotes(value) {
  return value
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ");
}

function normalizeKey(value) {
  return normalizeQuotes(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function shortHash(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function displayName(value) {
  return normalizeQuotes(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function displayCategory(value) {
  const category = displayName(value);
  if (normalizeKey(category) === "culture") return "Culture";
  return category;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readMaybeText(target) {
  if (!target) return "";
  try {
    const raw = await fs.readFile(target, "utf8");
    return normalizeQuotes(raw).replace(/\r\n/g, "\n").trim();
  } catch {
    return "";
  }
}

async function walkDirs(root) {
  const dirs = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      dirs.push(fullPath, ...(await walkDirs(fullPath)));
    }
  }
  return dirs;
}

function findFile(files, predicate) {
  return files.find((file) => predicate(file.name));
}

function extractTags(metadata, category, packTitle) {
  const firstLine = metadata.split("\n").find((line) => line.trim()) ?? "";
  const commaTags = firstLine
    .split(",")
    .map((tag) => normalizeKey(tag))
    .filter(Boolean);

  const extra = [category, packTitle]
    .flatMap((value) => normalizeKey(value).split(" "))
    .filter((value) => value.length > 2);

  const tags = Array.from(new Set([...commaTags, ...extra]));
  const fallbackTags = [packTitle, category, "instrumental", "exclusive"]
    .map((value) => normalizeKey(value))
    .filter(Boolean);

  for (const tag of fallbackTags) {
    if (tags.length >= 2) break;
    if (!tags.includes(tag)) tags.push(tag);
  }

  return tags.slice(0, 16);
}

function createWaveformSeed(label) {
  return Array.from(label).reduce((seed, character) => seed + character.charCodeAt(0), 97);
}

function generateWaveform(label) {
  let seed = createWaveformSeed(label);

  return Array.from({ length: 50 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const normalized = seed / 4294967296;
    const contour = Math.sin((index / 49) * Math.PI) * 0.18;

    return Number((0.22 + normalized * 0.58 + contour).toFixed(3));
  });
}

function inferHomeMood(record) {
  const haystack = normalizeKey(`${record.title} ${record.metadataText} ${record.tags.join(" ")}`);
  const moodChecks = [
    ["Energetic", ["energetic", "hype", "workout", "driving", "power", "festival"]],
    ["Calm", ["calm", "meditation", "yoga", "ambient", "peaceful", "soothing"]],
    ["Romantic", ["love", "romantic", "wedding", "emotional", "heartfelt"]],
    ["Dark", ["dark", "gritty", "underground", "noir", "trap", "phonk"]],
    ["Focus", ["study", "productivity", "focus", "background", "podcast"]],
    ["Cinematic", ["cinematic", "ost", "movie", "trailer", "epic"]],
    ["Groovy", ["groovy", "dance", "house", "swing", "funk"]],
  ];

  return moodChecks.find(([, tokens]) => tokens.some((token) => haystack.includes(token)))?.[0] ?? "Mixed";
}

function inferHomeBpm(record, index) {
  const match = record.metadataText.match(/\b([6-9]\d|1\d{2}|2[0-2]\d)\s*bpm\b/i);
  if (match) return Number(match[1]);
  if (record.category === "Electronic") return 118 + ((index * 7) % 52);
  if (record.category === "Occasion") return 82 + ((index * 5) % 58);
  return 88 + ((index * 11) % 64);
}

function toHomeTrack(record, index, flags = {}) {
  return {
    id: record.id,
    title: record.title,
    artist: "Keval Sound",
    audioUrl: record.hasMp3 ? createMp3StreamUrl(record.id) : undefined,
    lyricsUrl: record.hasLyrics ? record.lyricsUrl : undefined,
    genre: record.packTitle,
    mood: inferHomeMood(record),
    bpm: inferHomeBpm(record, index),
    key: KEY_ROTATION[index % KEY_ROTATION.length],
    duration: 210,
    price: 99,
    coverUrl: record.coverUrl,
    waveform: generateWaveform(record.id),
    tags: record.tags,
    isExclusive: true,
    isTrending: Boolean(flags.isTrending),
    isSellingFast: Boolean(flags.isSellingFast),
    region: "Global",
    language: record.isInstrumental ? "Instrumental" : "English",
    stems: record.hasWav,
    plays: 1200 + index * 31,
  };
}

function createMp3StreamUrl(trackId) {
  return `/api/media/stream/mp3/${encodeURIComponent(trackId)}`;
}

function buildHomeCatalog(records) {
  const availableRecords = records.filter((record) => record.hasMp3);
  const packOrder = new Map(PACKS.map(([n], index) => [`pack-${n}`, index]));
  const groupedRecords = new Map();

  for (const record of availableRecords) {
    const packRecords = groupedRecords.get(record.packId) ?? [];
    packRecords.push(record);
    groupedRecords.set(record.packId, packRecords);
  }

  const sortedPackGroups = Array.from(groupedRecords.values()).sort((left, right) => {
    const leftFirst = left[0];
    const rightFirst = right[0];
    const leftOrder = packOrder.get(leftFirst.packId) ?? 999;
    const rightOrder = packOrder.get(rightFirst.packId) ?? 999;
    return leftOrder - rightOrder || leftFirst.packTitle.localeCompare(rightFirst.packTitle);
  });

  const uniqueRecords = [];
  const seenRecordIds = new Set();
  const pushUnique = (record) => {
    if (!record || seenRecordIds.has(record.id)) return;
    seenRecordIds.add(record.id);
    uniqueRecords.push(record);
  };

  sortedPackGroups.forEach((packRecords) => pushUnique(packRecords[0]));
  availableRecords.forEach(pushUnique);

  const homeTracks = uniqueRecords.slice(0, 96).map((record, index) =>
    toHomeTrack(record, index, {
      isTrending: index < 12,
      isSellingFast: record.category === "Occasion" && index < 24,
    })
  );

  const homePacks = sortedPackGroups.map((packRecords, index) => {
    const first = packRecords[0];
    const previewTrack = toHomeTrack(first, index, {
      isTrending: index < 8,
      isSellingFast: first.category === "Occasion" && index < 18,
    });
    const tags = Array.from(new Set(packRecords.flatMap((record) => record.tags))).slice(0, 8);
    const premiumPack = packRecords.length > 30;

    return {
      id: first.packId,
      title: first.packTitle,
      description: `${packRecords.length} ${first.packTitle} tracks from the production catalog.`,
      coverUrl: first.coverUrl,
      trackCount: packRecords.length,
      totalDuration: packRecords.length * 210,
      price: premiumPack ? 14999 : 7499,
      originalPrice: premiumPack ? 24999 : 12999,
      genre: first.category,
      category: first.category,
      mood: "Mixed",
      tracks: [previewTrack],
      tags,
      featured: ["pack-1", "pack-7", "pack-23", "pack-24"].includes(first.packId),
    };
  });

  return { homeTracks, homePacks };
}

async function main() {
  if (!(await exists(SOURCE_ROOT))) {
    throw new Error(`Production source folder not found: ${SOURCE_ROOT}`);
  }

  const dirs = await walkDirs(SOURCE_ROOT);
  const records = [];

  for (const dir of dirs) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({ name: entry.name, fullPath: path.join(dir, entry.name) }));

    const mp3 = findFile(files, (name) => name.toLowerCase().endsWith(".mp3"));
    const wav = findFile(files, (name) => name.toLowerCase().endsWith(".wav"));
    const mdata = findFile(files, (name) => /^mdata\.txt$/i.test(name));

    if (!mp3 && !wav && !mdata) continue;

    const lyrics = findFile(files, (name) => /lyrics/i.test(name) && name.toLowerCase().endsWith(".txt"));
    const relativeParts = path.relative(SOURCE_ROOT, dir).split(path.sep);
    const [categoryFolder, packFolder, ...songParts] = relativeParts;
    if (!categoryFolder || !packFolder || songParts.length === 0) continue;

    const fallbackPack = {
      id: `external-${slugify(packFolder)}`,
      title: displayName(packFolder),
      category: displayName(categoryFolder),
      coverUrl: "/packs/pack-1.png",
    };
    const packMeta = PACK_BY_KEY.get(normalizeKey(packFolder)) ?? fallbackPack;
    const titleFromAudio = mp3?.name.replace(/\.mp3$/i, "") ?? wav?.name.replace(/\.wav$/i, "");
    const songTitle = displayName(songParts.at(-1) || titleFromAudio || "Untitled");
    const category = displayCategory(categoryFolder);
    const metadataText = await readMaybeText(mdata?.fullPath);
    const songSlug = slugify(songTitle) || `track-${shortHash(path.relative(SOURCE_ROOT, dir))}`;
    const categorySlug = slugify(category);
    const packSlug = slugify(packMeta.title);
    const cloudBasePath = `${categorySlug}/${packSlug}/${songSlug}`;
    const recordId = `${packMeta.id}-${songSlug}`;

    records.push({
      id: recordId,
      title: songTitle,
      packId: packMeta.id,
      packTitle: packMeta.title,
      category: packMeta.category,
      sourceCategory: category,
      coverUrl: packMeta.coverUrl,
      hasMp3: Boolean(mp3),
      hasWav: Boolean(wav),
      hasLyrics: Boolean(lyrics),
      isInstrumental: !lyrics,
      mp3Path: `public/mp3/${cloudBasePath}.mp3`,
      lyricsUrl: lyrics ? `${PUBLIC_CDN_BASE}/public/lyrics/${cloudBasePath}.txt` : undefined,
      wavPath: `private/wav/${cloudBasePath}.wav`,
      sourcePath: path.relative(PROJECT_ROOT, dir).replaceAll(path.sep, "/"),
      metadataText,
      tags: extractTags(metadataText, category, packMeta.title),
    });
  }

  records.sort((a, b) => a.packId.localeCompare(b.packId) || a.title.localeCompare(b.title));

  const output = `// Generated by scripts/generate-production-catalog.mjs. Do not edit by hand.\n\n` +
    `export interface ProductionSongRecord {\n` +
    `  id: string;\n` +
    `  title: string;\n` +
    `  packId: string;\n` +
    `  packTitle: string;\n` +
    `  category: string;\n` +
    `  sourceCategory: string;\n` +
    `  coverUrl: string;\n` +
    `  hasMp3: boolean;\n` +
    `  hasWav: boolean;\n` +
    `  hasLyrics: boolean;\n` +
    `  isInstrumental: boolean;\n` +
    `  mp3Path: string;\n` +
    `  lyricsUrl?: string;\n` +
    `  wavPath: string;\n` +
    `  sourcePath: string;\n` +
    `  metadataText: string;\n` +
    `  tags: string[];\n` +
    `}\n\n` +
    `export const productionCatalogGeneratedAt = ${JSON.stringify(new Date().toISOString())};\n\n` +
    `export const productionSongRecords = ${JSON.stringify(records, null, 2)} satisfies ProductionSongRecord[];\n`;

  const { homeTracks, homePacks } = buildHomeCatalog(records);
  const homeOutput = `// Generated by scripts/generate-production-catalog.mjs. Do not edit by hand.\n\n` +
    `import type { Pack, Track } from "./mock-data";\n\n` +
    `export const productionHomeGeneratedAt = ${JSON.stringify(new Date().toISOString())};\n\n` +
    `export const productionHomeTracks = ${JSON.stringify(homeTracks, null, 2)} satisfies Track[];\n\n` +
    `export const productionHomePacks = ${JSON.stringify(homePacks, null, 2)} satisfies Pack[];\n`;

  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  await fs.writeFile(HOME_OUTPUT_FILE, homeOutput, "utf8");
  console.log(`Generated ${records.length} production song records at ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
  console.log(`Generated ${homeTracks.length} home tracks and ${homePacks.length} home packs at ${path.relative(PROJECT_ROOT, HOME_OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
