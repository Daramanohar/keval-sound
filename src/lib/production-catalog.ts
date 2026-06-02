import {
  productionCatalogGeneratedAt,
  productionSongRecords,
  type ProductionSongRecord,
} from "./production-catalog.generated";
import { packs as basePacks, type Pack, type Track } from "./mock-data";

export type CatalogCategory =
  | "Occasion"
  | "Commercial"
  | "Electronic"
  | "Bollywood"
  | "Indie"
  | "Culture"
  | "Classic";

export interface ProductionTrack extends Track {
  packId: string;
  packTitle: string;
  category: string;
  searchText: string;
  hasLyrics: boolean;
  isInstrumental: boolean;
  hasMp3: boolean;
  hasWav: boolean;
  mp3Path: string;
  wavPath: string;
  sourcePath: string;
  streamReady: boolean;
}

export interface ProductionPack extends Pack {
  tracks: ProductionTrack[];
  availableTrackCount: number;
  expectedTrackCount: number;
  sourceStatus: "ready" | "pending";
}

const STREAMS_READY = process.env.NEXT_PUBLIC_KEVAL_STREAMS_READY !== "0";
const CATEGORIES: CatalogCategory[] = [
  "Occasion",
  "Commercial",
  "Electronic",
  "Bollywood",
  "Indie",
  "Culture",
  "Classic",
];
const KEY_ROTATION = ["Am", "C", "Em", "G", "Dm", "F", "Bbm", "D"] as const;

function createWaveformSeed(label: string): number {
  return Array.from(label).reduce((seed, character) => seed + character.charCodeAt(0), 97);
}

function generateWaveform(label: string): number[] {
  let seed = createWaveformSeed(label);

  return Array.from({ length: 50 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const normalized = seed / 4294967296;
    const contour = Math.sin((index / 49) * Math.PI) * 0.18;

    return Number((0.22 + normalized * 0.58 + contour).toFixed(3));
  });
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferMood(record: ProductionSongRecord): string {
  const haystack = normalizeSearchText(`${record.title} ${record.metadataText} ${record.tags.join(" ")}`);
  const moodChecks: [string, string[]][] = [
    ["Energetic", ["energetic", "hype", "workout", "driving", "power", "festival"]],
    ["Calm", ["calm", "meditation", "yoga", "ambient", "peaceful", "soothing"]],
    ["Romantic", ["love", "romantic", "wedding", "emotional", "heartfelt"]],
    ["Dark", ["dark", "gritty", "underground", "noir", "trap", "phonk"]],
    ["Focus", ["study", "productivity", "focus", "background", "podcast"]],
    ["Cinematic", ["cinematic", "ost", "movies", "trailer", "epic"]],
    ["Groovy", ["groovy", "dance", "house", "swing", "funk"]],
  ];

  return moodChecks.find(([, tokens]) => tokens.some((token) => haystack.includes(token)))?.[0] ?? "Mixed";
}

function inferBpm(record: ProductionSongRecord, index: number): number {
  const match = record.metadataText.match(/\b([6-9]\d|1\d{2}|2[0-2]\d)\s*bpm\b/i);
  if (match) return Number(match[1]);
  if (record.category === "Electronic") return 118 + ((index * 7) % 52);
  if (record.category === "Occasion") return 82 + ((index * 5) % 58);
  return 88 + ((index * 11) % 64);
}

function buildSearchText(record: ProductionSongRecord): string {
  return normalizeSearchText(
    [
      record.title,
      record.packTitle,
      record.category,
      record.sourceCategory,
      record.isInstrumental ? "instrumental bgm background no lyrics" : "lyrical vocals song lyrics",
      record.tags.join(" "),
      record.metadataText,
    ].join(" ")
  );
}

function toProductionTrack(record: ProductionSongRecord, index: number): ProductionTrack {
  const bpm = inferBpm(record, index);
  const mood = inferMood(record);
  const streamReady = STREAMS_READY && record.hasMp3;

  return {
    id: record.id,
    title: record.title,
    artist: "Keval Sound",
    audioUrl: streamReady ? createMp3StreamUrl(record.id) : undefined,
    lyricsUrl: STREAMS_READY && record.hasLyrics ? record.lyricsUrl : undefined,
    genre: record.packTitle,
    mood,
    bpm,
    key: KEY_ROTATION[index % KEY_ROTATION.length],
    duration: 210,
    price: 99,
    coverUrl: record.coverUrl,
    waveform: generateWaveform(record.id),
    tags: record.tags,
    isExclusive: true,
    isTrending: index < 5,
    isSellingFast: record.category === "Occasion" && index < 3,
    region: "Global",
    language: record.isInstrumental ? "Instrumental" : "English",
    stems: record.hasWav,
    plays: 1200 + index * 31,
    packId: record.packId,
    packTitle: record.packTitle,
    category: record.category,
    searchText: buildSearchText(record),
    hasLyrics: record.hasLyrics,
    isInstrumental: record.isInstrumental,
    hasMp3: record.hasMp3,
    hasWav: record.hasWav,
    mp3Path: record.mp3Path,
    wavPath: record.wavPath,
    sourcePath: record.sourcePath,
    streamReady,
  };
}

function createMp3StreamUrl(trackId: string): string {
  return `/api/media/stream/mp3/${encodeURIComponent(trackId)}`;
}

const recordsByPackId = productionSongRecords.reduce<Record<string, ProductionSongRecord[]>>(
  (acc, record) => {
    (acc[record.packId] ??= []).push(record);
    return acc;
  },
  {}
);

const basePackIds = new Set(basePacks.map((pack) => pack.id));

function toProductionPack(pack: Pack, records: ProductionSongRecord[]): ProductionPack {
  const productionTracks = records.map((record, index) => toProductionTrack(record, index));

  return {
    ...pack,
    tracks: productionTracks,
    trackCount: productionTracks.length,
    availableTrackCount: productionTracks.length,
    expectedTrackCount: pack.trackCount,
    totalDuration: productionTracks.length * 210,
    sourceStatus: productionTracks.length > 0 ? "ready" : "pending",
  };
}

function createGeneratedPack(records: ProductionSongRecord[]): ProductionPack {
  const first = records[0];
  const tracks = records.map((record, index) => toProductionTrack(record, index));
  const price = tracks.length > 30 ? 14999 : 7499;
  const originalPrice = tracks.length > 30 ? 24999 : 12999;

  return {
    id: first.packId,
    title: first.packTitle,
    description: `${tracks.length} ${first.packTitle} tracks from the production catalog.`,
    coverUrl: first.coverUrl,
    trackCount: tracks.length,
    totalDuration: tracks.length * 210,
    price,
    originalPrice,
    genre: first.category,
    category: first.category,
    mood: "Mixed",
    tracks,
    tags: Array.from(new Set(records.flatMap((record) => record.tags))).slice(0, 8),
    featured: false,
    availableTrackCount: tracks.length,
    expectedTrackCount: tracks.length,
    sourceStatus: "ready",
  };
}

export const productionPacks: ProductionPack[] = [
  ...basePacks.map((pack) => toProductionPack(pack, recordsByPackId[pack.id] ?? [])),
  ...Object.entries(recordsByPackId)
    .filter(([packId]) => !basePackIds.has(packId))
    .map(([, records]) => createGeneratedPack(records)),
];

export const readyProductionPacks = productionPacks.filter((pack) => pack.sourceStatus === "ready");
export const productionTracks = productionPacks.flatMap((pack) => pack.tracks);
export const productionCategories = CATEGORIES;

export const productionCatalogStats = {
  generatedAt: productionCatalogGeneratedAt,
  streamsReady: STREAMS_READY,
  packsReady: readyProductionPacks.length,
  tracksReady: productionTracks.length,
  mp3Tracks: productionTracks.filter((track) => track.hasMp3).length,
  wavTracks: productionTracks.filter((track) => track.hasWav).length,
  instrumentalTracks: productionTracks.filter((track) => track.isInstrumental).length,
  lyricalTracks: productionTracks.filter((track) => track.hasLyrics).length,
};

export function getProductionPacksByCategory(category: CatalogCategory | "All") {
  if (category === "All") return productionPacks;
  return productionPacks.filter((pack) => pack.category === category);
}

export function searchProductionTracks(query: string, options?: { category?: CatalogCategory | "All"; limit?: number }) {
  const normalizedQuery = normalizeSearchText(query);
  const limit = options?.limit ?? 80;
  const category = options?.category ?? "All";

  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
  const scopedTracks =
    category === "All"
      ? productionTracks
      : productionTracks.filter((track) => track.category === category);

  return scopedTracks
    .map((track) => {
      const title = normalizeSearchText(track.title);
      const packTitle = normalizeSearchText(track.packTitle);
      const tagText = normalizeSearchText(track.tags.join(" "));
      let score = 0;

      if (title === normalizedQuery) score += 160;
      if (title.startsWith(normalizedQuery)) score += 90;
      if (title.includes(normalizedQuery)) score += 70;
      if (packTitle.includes(normalizedQuery)) score += 45;
      if (tagText.includes(normalizedQuery)) score += 35;
      if (track.searchText.includes(normalizedQuery)) score += 30;
      if (track.hasMp3) score += 4;
      if (track.hasWav) score += 2;

      for (const token of tokens) {
        if (title.includes(token)) score += 18;
        if (packTitle.includes(token)) score += 12;
        if (tagText.includes(token)) score += 10;
        if (track.searchText.includes(token)) score += 5;
      }

      return { track, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.track.plays - a.track.plays)
    .slice(0, limit)
    .map((result) => result.track);
}
