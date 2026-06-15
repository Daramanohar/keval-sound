import { productionSongRecords, type ProductionSongRecord } from "@/lib/production-catalog.generated";
import type { Track } from "@/lib/mock-data";

const KEY_ROTATION = ["Am", "C", "Em", "G", "Dm", "F", "Bbm", "D"];
const MAX_RESULTS = 160;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "background",
  "be",
  "for",
  "from",
  "give",
  "i",
  "in",
  "is",
  "it",
  "me",
  "music",
  "need",
  "of",
  "on",
  "song",
  "songs",
  "sound",
  "the",
  "this",
  "to",
  "track",
  "tracks",
  "type",
  "want",
  "with",
]);

const INTENT_EXPANSIONS: Array<[RegExp, string[]]> = [
  [/\b(movie|film|short film|cinema|scene|trailer|teaser|documentary)\b/, ["cinematic", "soundtrack", "orchestral", "dramatic", "ambient"]],
  [/\b(clip|reel|short|youtube|instagram|content|creator|vlog|video)\b/, ["content", "creator", "background", "upbeat", "commercial"]],
  [/\b(wedding|marriage|bride|groom|event|celebration)\b/, ["wedding", "romantic", "love", "celebratory", "uplifting"]],
  [/\b(workout|gym|fitness|training|run|running|sports)\b/, ["workout", "fitness", "energetic", "hype", "driving"]],
  [/\b(study|focus|productivity|coding|work|deep work)\b/, ["study", "productivity", "focus", "lo-fi", "ambient"]],
  [/\b(meditation|yoga|sleep|calm|relax|peaceful|healing)\b/, ["meditation", "yoga", "calming", "ambient", "soft"]],
  [/\b(luxury|premium|fashion|brand|corporate|presentation)\b/, ["luxury", "corporate", "presentation", "smooth", "commercial"]],
  [/\b(dance|party|club|festival|edm|dj)\b/, ["dance", "club", "festival", "electronic", "house"]],
  [/\b(dark|crime|horror|thriller|suspense|tension|mystery)\b/, ["dark", "dramatic", "tension", "cinematic", "ambient"]],
  [/\b(indian|desi|bollywood|hindi)\b/, ["hindi", "bollywood", "indian", "fusion"]],
];

export type ExploreGenreOption = {
  name: string;
  count: number;
  category: string;
};

export type ExploreCategoryOption = {
  name: string;
  count: number;
};

export type ExploreSearchResponse = {
  query: string;
  originalQuery?: string;
  optimizedQuery?: string;
  acknowledgement?: string;
  genre: string;
  total: number;
  limit: number;
  tracks: Track[];
  genres: ExploreGenreOption[];
  categories: ExploreCategoryOption[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[/_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function expandQuery(query: string) {
  const normalized = normalizeText(query);
  const expanded = new Set(tokenize(normalized));

  for (const [pattern, terms] of INTENT_EXPANSIONS) {
    if (pattern.test(normalized)) {
      terms.forEach((term) => tokenize(term).forEach((token) => expanded.add(token)));
    }
  }

  return Array.from(expanded);
}

function includesWholeText(haystack: string, needle: string) {
  return Boolean(needle) && haystack.includes(needle);
}

function displayTagName(tag: string) {
  return tag
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bedm\b/gi, "EDM")
    .replace(/\br&b\b/gi, "R&B")
    .replace(/\br and b\b/gi, "R&B")
    .replace(/\brnb\b/gi, "R&B")
    .replace(/\bdnb\b/gi, "D&B")
    .replace(/\blofi\b/gi, "Lo-Fi")
    .replace(/\blo fi\b/gi, "Lo-Fi")
    .replace(/\bhip hop rap\b/gi, "Hip-Hop / Rap")
    .replace(/\bhip hop\b/gi, "Hip-Hop")
    .replace(/\bhip-hop\b/gi, "Hip-Hop")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function countIncludes(values: string[], token: string, weight: number) {
  return values.reduce((score, value) => score + (value.includes(token) ? weight : 0), 0);
}

function inferMood(record: ProductionSongRecord) {
  const haystack = normalizeText(`${record.title} ${record.packTitle} ${record.tags.join(" ")} ${record.metadataText}`);
  const checks: Array<[string, string[]]> = [
    ["Cinematic", ["cinematic", "soundtrack", "trailer", "orchestral", "movie", "dramatic"]],
    ["Energetic", ["energetic", "hype", "workout", "driving", "festival", "club"]],
    ["Calm", ["calm", "calming", "meditation", "yoga", "sleep", "soft", "soothing"]],
    ["Romantic", ["romantic", "love", "wedding", "heartfelt", "emotional"]],
    ["Dark", ["dark", "gritty", "thriller", "suspense", "phonk", "trap"]],
    ["Groovy", ["groove", "groovy", "funk", "house", "dance", "swing"]],
    ["Focus", ["study", "focus", "productivity", "lo-fi", "ambient"]],
  ];

  return checks.find(([, terms]) => terms.some((term) => haystack.includes(term)))?.[0] ?? "Mixed";
}

function inferBpm(record: ProductionSongRecord, index: number) {
  const match = record.metadataText.match(/\b([6-9]\d|1\d{2}|2[0-2]\d)\s*bpm\b/i);
  if (match) return Number(match[1]);
  if (record.category === "Electronic") return 118 + ((index * 7) % 52);
  if (record.category === "Occasion") return 82 + ((index * 5) % 58);
  return 88 + ((index * 11) % 64);
}

function createWaveformSeed(label: string) {
  return Array.from(label).reduce((seed, character) => seed + character.charCodeAt(0), 97);
}

function generateWaveform(label: string) {
  let seed = createWaveformSeed(label);

  return Array.from({ length: 50 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const normalized = seed / 4294967296;
    const contour = Math.sin((index / 49) * Math.PI) * 0.18;
    return Number((0.22 + normalized * 0.58 + contour).toFixed(3));
  });
}

export function recordToExploreTrack(record: ProductionSongRecord, index: number): Track {
  return {
    id: record.id,
    title: record.title,
    artist: "Keval Sound",
    audioUrl: record.hasMp3 ? `/api/media/stream/mp3/${encodeURIComponent(record.id)}` : undefined,
    lyricsUrl: record.hasLyrics ? record.lyricsUrl : undefined,
    genre: record.packTitle,
    mood: inferMood(record),
    bpm: inferBpm(record, index),
    key: KEY_ROTATION[index % KEY_ROTATION.length],
    duration: record.durationSeconds,
    price: 99,
    coverUrl: record.coverUrl,
    waveform: generateWaveform(record.id),
    tags: record.tags,
    isExclusive: true,
    isTrending: index < 12,
    isSellingFast: record.category === "Occasion" && index < 48,
    region: record.sourceCategory,
    language: record.isInstrumental ? "Instrumental" : "Vocal",
    stems: record.hasWav,
    plays: 1200 + index * 17,
  };
}

function getSearchFields(record: ProductionSongRecord) {
  const title = normalizeText(record.title);
  const pack = normalizeText(record.packTitle);
  const category = normalizeText(record.category);
  const sourceCategory = normalizeText(record.sourceCategory);
  const tags = record.tags.map(normalizeText);
  const metadata = normalizeText(record.metadataText);
  const source = normalizeText(record.sourcePath);

  return { title, pack, category, sourceCategory, tags, metadata, source };
}

export function matchesExploreFilter(record: ProductionSongRecord, filter: string) {
  const normalizedFilter = filter === "All" ? "All Genres" : filter;
  if (normalizedFilter === "All Genres") return true;

  const phrase = normalizeText(normalizedFilter);
  if (!phrase) return true;

  const fields = getSearchFields(record);

  return fields.tags.some((tag) => tag === phrase || tag.includes(phrase));
}

function scoreRecord(record: ProductionSongRecord, query: string, tokens: string[]) {
  if (!query && tokens.length === 0) return 1;

  const phrase = normalizeText(query);
  const fields = getSearchFields(record);
  let score = 0;

  if (includesWholeText(fields.title, phrase)) score += 120;
  if (includesWholeText(fields.pack, phrase)) score += 90;
  if (fields.tags.some((tag) => includesWholeText(tag, phrase))) score += 70;
  if (includesWholeText(fields.metadata, phrase)) score += 50;
  if (includesWholeText(fields.category, phrase) || includesWholeText(fields.sourceCategory, phrase)) score += 35;

  let matchedTokens = 0;
  for (const token of tokens) {
    const tokenScore =
      (fields.title.includes(token) ? 26 : 0) +
      (fields.pack.includes(token) ? 22 : 0) +
      (fields.category.includes(token) || fields.sourceCategory.includes(token) ? 14 : 0) +
      countIncludes(fields.tags, token, 16) +
      (fields.metadata.includes(token) ? 5 : 0) +
      (fields.source.includes(token) ? 3 : 0);

    if (tokenScore > 0) matchedTokens += 1;
    score += tokenScore;
  }

  if (tokens.length > 0 && matchedTokens === tokens.length) score += 45;
  if (tokens.length > 2 && matchedTokens >= Math.ceil(tokens.length * 0.7)) score += 25;

  return score;
}

function mixRecordsAcrossPacks(records: ProductionSongRecord[]) {
  if (!records.length) return [];

  const buckets = new Map<string, ProductionSongRecord[]>();

  for (const record of records) {
    const bucket = buckets.get(record.packId) ?? [];
    bucket.push(record);
    buckets.set(record.packId, bucket);
  }

  const sortedBuckets = Array.from(buckets.values()).sort((left, right) => {
    const leftFirst = left[0];
    const rightFirst = right[0];
    return leftFirst.category.localeCompare(rightFirst.category) ||
      leftFirst.packTitle.localeCompare(rightFirst.packTitle);
  });
  const maxBucketLength = Math.max(...sortedBuckets.map((bucket) => bucket.length));
  const mixed: ProductionSongRecord[] = [];

  for (let index = 0; index < maxBucketLength; index += 1) {
    for (const bucket of sortedBuckets) {
      const record = bucket[index];
      if (record) mixed.push(record);
    }
  }

  return mixed;
}

export function diversifyRecordsAcrossPacks(records: ProductionSongRecord[], limit = MAX_RESULTS) {
  if (!records.length) return [];

  const buckets = new Map<string, ProductionSongRecord[]>();
  const seen = new Set<string>();

  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);

    const bucket = buckets.get(record.packId) ?? [];
    bucket.push(record);
    buckets.set(record.packId, bucket);
  }

  const bucketList = Array.from(buckets.values());
  const diversified: ProductionSongRecord[] = [];

  while (diversified.length < limit) {
    let addedInPass = false;

    for (const bucket of bucketList) {
      const record = bucket.shift();
      if (!record) continue;

      diversified.push(record);
      addedInPass = true;

      if (diversified.length >= limit) break;
    }

    if (!addedInPass) break;
  }

  return diversified;
}

export function getExploreGenres(): ExploreGenreOption[] {
  const counts = new Map<string, ExploreGenreOption>();

  for (const record of productionSongRecords) {
    if (!record.hasMp3) continue;

    for (const tag of record.tags) {
      const normalizedTag = normalizeText(tag);
      if (!normalizedTag || normalizedTag.length < 3) continue;

      const current = counts.get(normalizedTag);
      if (current) {
        current.count += 1;
      } else {
        counts.set(normalizedTag, {
          name: displayTagName(tag),
          count: 1,
          category: record.category,
        });
      }
    }
  }

  return Array.from(counts.values())
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.category.localeCompare(right.category) ||
        left.name.localeCompare(right.name)
    );
}

export function getExploreCategories(): ExploreCategoryOption[] {
  const counts = new Map<string, number>();

  for (const record of productionSongRecords) {
    if (!record.hasMp3) continue;
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function searchExploreTracks(query: string, genre = "All Genres", limit = MAX_RESULTS) {
  const normalizedGenre = genre === "All" ? "All Genres" : genre;
  const cleanQuery = query.trim();
  const tokens = expandQuery(cleanQuery);
  const scopedRecords = productionSongRecords
    .filter((record) => record.hasMp3)
    .filter((record) => matchesExploreFilter(record, normalizedGenre));

  if (!cleanQuery) {
    const records = normalizedGenre === "All Genres"
      ? mixRecordsAcrossPacks(scopedRecords)
      : diversifyRecordsAcrossPacks(scopedRecords, limit);

    return {
      query: cleanQuery,
      genre: normalizedGenre,
      total: scopedRecords.length,
      limit,
      tracks: records.slice(0, limit).map((record, index) => recordToExploreTrack(record, index)),
      genres: getExploreGenres(),
      categories: getExploreCategories(),
    } satisfies ExploreSearchResponse;
  }

  const candidates = scopedRecords
    .map((record, index) => ({
      record,
      index,
      score: scoreRecord(record, cleanQuery, tokens),
    }))
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.record.packTitle.localeCompare(right.record.packTitle) ||
        left.record.title.localeCompare(right.record.title);
    });

  return {
    query: cleanQuery,
    genre: normalizedGenre,
    total: candidates.length,
    limit,
    tracks: diversifyRecordsAcrossPacks(
      candidates.map((result) => result.record),
      limit
    ).map((record, index) => recordToExploreTrack(record, index)),
    genres: getExploreGenres(),
    categories: getExploreCategories(),
  } satisfies ExploreSearchResponse;
}
