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

const CATEGORY_DISCOVERY_ORDER = ["Culture", "Commercial", "Electronic", "Bollywood", "Indie", "Occasion", "Classic"];
const PACK_DISCOVERY_ORDER = ["Pop", "R&B", "Hip-Hop / Rap", "Rock", "Electronic"];

const CANONICAL_TAG_RULES: Array<[string, RegExp[]]> = [
  ["Lo-Fi", [/\blo\s*fi\b/, /\blofi\b/, /\bchillhop\b/]],
  ["R&B", [/\br\s*and\s*b\b/, /\br&b\b/, /\brnb\b/]],
  ["Drum & Bass", [/\bdrum\s*and\s*bass\b/, /\bdnb\b/]],
  ["Hip-Hop / Rap", [/\bhip\s*hop\b/, /\brap\b/, /\bboom bap\b/]],
  ["Dubstep", [/\bdubstep\b/]],
  ["Phonk", [/\bphonk\b/]],
  ["Trap", [/\btrap\b/]],
  ["Techno", [/\btechno\b/]],
  ["House", [/\bhouse\b/]],
  ["Trance", [/\btrance\b/, /\bpsy\s*trance\b/]],
  ["EDM", [/\bedm\b/]],
  ["Amapiano", [/\bamapiano\b/]],
  ["Breakbeat", [/\bbreakbeat\b/]],
  ["Downtempo", [/\bdowntempo\b/]],
  ["Hardstyle", [/\bhardstyle\b/]],
  ["Neurofunk", [/\bneurofunk\b/]],
  ["Synthwave", [/\bsynthwave\b/]],
  ["Hyperpop", [/\bhyperpop\b/]],
  ["Electronic", [/\belectronic\b/, /\belectro\b/, /\bsynth\b/, /\bbass music\b/]],
  ["Metal", [/\bmetal\b/, /\bmetalcore\b/]],
  ["Punk", [/\bpunk\b/]],
  ["Rock", [/\brock\b/]],
  ["Indie", [/\bindie\b/]],
  ["Pop", [/\bpop\b/]],
  ["Acoustic", [/\bacoustic\b/]],
  ["Ambient", [/\bambient\b/, /\bdrone\b/]],
  ["Cinematic", [/\bcinematic\b/, /\bfilm\b/, /\bmovie\b/, /\bscore\b/]],
  ["Orchestral", [/\borchestral\b/, /\borchestra\b/]],
  ["Soundtrack", [/\bsoundtrack\b/]],
  ["Classical", [/\bclassical\b/]],
  ["Jazz", [/\bjazz\b/, /\bjazzy\b/]],
  ["Blues", [/\bblues\b/]],
  ["Soul", [/\bsoul\b/, /\bsoulful\b/]],
  ["Gospel", [/\bgospel\b/]],
  ["Folk", [/\bfolk\b/]],
  ["Country", [/\bcountry\b/]],
  ["Reggae", [/\breggae\b/, /\bdub reggae\b/]],
  ["Latin", [/\blatin\b/, /\btropical latin\b/]],
  ["Salsa", [/\bsalsa\b/]],
  ["Bachata", [/\bbachata\b/]],
  ["Bossa Nova", [/\bbossa\s*nova\b/]],
  ["Samba", [/\bsamba\b/]],
  ["Reggaeton", [/\breggaeton\b/]],
  ["Afrobeat", [/\bafrobeat\b/, /\bafro\s*house\b/]],
  ["Funk", [/\bfunk\b/, /\bmotown\b/, /\bdisco\b/]],
  ["Bollywood", [/\bbollywood\b/]],
  ["Hindi", [/\bhindi\b/]],
  ["Indian Classical", [/\bindian classical\b/, /\bcarnatic\b/, /\bsitar\b/]],
  ["Desi", [/\bdesi\b/]],
  ["Arabic", [/\barabic\b/, /\bmiddle eastern\b/, /\bdesert\b/]],
  ["K-Pop", [/\bk\s*pop\b/, /\bkorean\b/]],
  ["Anime", [/\banime\b/]],
  ["Chinese", [/\bchinese\b/]],
  ["Japanese", [/\bjapanese\b/]],
  ["Brazilian", [/\bbrazilian\b/, /\bbaile\b/, /\bcarnival\b/]],
  ["Devotional", [/\bdevotional\b/, /\bspiritual\b/, /\bchant\b/]],
  ["Meditation", [/\bmeditation\b/, /\byoga\b/, /\bhealing\b/]],
  ["Dance", [/\bdance\b/, /\bclub\b/, /\bfestival\b/]],
  ["Workout", [/\bworkout\b/, /\bgym\b/, /\bfitness\b/]],
  ["Ballad", [/\bballad\b/]],
  ["Romantic", [/\bromantic\b/, /\blove\b/, /\bheartfelt\b/]],
  ["Uplifting", [/\buplifting\b/, /\bfeel good\b/, /\bcelebratory\b/]],
  ["Dark", [/\bdark\b/, /\bgothic\b/, /\bthriller\b/, /\bsuspense\b/]],
  ["Dramatic", [/\bdramatic\b/, /\bepic\b/]],
  ["Hypnotic", [/\bhypnotic\b/]],
  ["Glitch", [/\bglitch\b/, /\bglitchy\b/]],
  ["Experimental", [/\bexperimental\b/, /\bpsychedelic\b/]],
  ["Mellow", [/\bmellow\b/, /\bchill\b/]],
  ["Calming", [/\bcalm\b/, /\bcalming\b/, /\bsoothing\b/, /\bpeaceful\b/]],
  ["Emotional", [/\bemotional\b/]],
  ["Bright", [/\bbright\b/]],
  ["Moody", [/\bmoody\b/]],
  ["Motivational", [/\bmotivational\b/, /\binspiring\b/]],
  ["Nostalgic", [/\bnostalgic\b/, /\bvintage\b/]],
  ["Minimal", [/\bminimal\b/, /\bminimalist\b/]],
  ["Smooth", [/\bsmooth\b/, /\blounge\b/]],
  ["Aggressive", [/\baggressive\b/, /\bhard hitting\b/, /\bheavy\b/]],
  ["Dreamy", [/\bdreamy\b/]],
  ["Warm", [/\bwarm\b/]],
  ["Piano", [/\bpiano\b/]],
  ["Guitar", [/\bguitar\b/]],
  ["Drums", [/\bdrum\b/, /\bpercussion\b/]],
  ["Bass", [/\bbass\b/, /\b808\b/]],
  ["Vocal", [/\bvocal\b/, /\blyrical\b/]],
  ["Instrumental", [/\binstrumental\b/]],
];

const normalizedTagCache = new Map<string, string[]>();
const canonicalTagCache = new Map<string, string[]>();
const searchFieldCache = new Map<string, ReturnType<typeof createSearchFields>>();
let cachedExploreGenres: ExploreGenreOption[] | null = null;
let cachedExploreCategories: ExploreCategoryOption[] | null = null;

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

function getCategoryRank(category: string) {
  const rank = CATEGORY_DISCOVERY_ORDER.indexOf(category);
  return rank === -1 ? CATEGORY_DISCOVERY_ORDER.length : rank;
}

function getPackRank(packTitle: string) {
  const normalizedPack = normalizeText(packTitle);
  const rank = PACK_DISCOVERY_ORDER.findIndex((pack) => normalizeText(pack) === normalizedPack);
  return rank === -1 ? PACK_DISCOVERY_ORDER.length : rank;
}

function canonicalizeTag(tag: string) {
  const normalized = normalizeText(tag);
  if (!normalized || normalized.length < 3) return null;

  const rule = CANONICAL_TAG_RULES.find(([, patterns]) =>
    patterns.some((pattern) => pattern.test(normalized))
  );

  return rule?.[0] ?? null;
}

function createSearchFields(record: ProductionSongRecord) {
  const title = normalizeText(record.title);
  const pack = normalizeText(record.packTitle);
  const category = normalizeText(record.category);
  const sourceCategory = normalizeText(record.sourceCategory);
  const tags = getNormalizedTags(record);
  const metadata = normalizeText(record.metadataText);
  const source = normalizeText(record.sourcePath);

  return { title, pack, category, sourceCategory, tags, metadata, source };
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
    tags: getCanonicalTags(record),
    isExclusive: true,
    isTrending: index < 12,
    isSellingFast: record.category === "Occasion" && index < 48,
    region: record.sourceCategory,
    language: record.isInstrumental ? "Instrumental" : "Vocal",
    stems: record.hasWav,
    plays: 1200 + index * 17,
  };
}

function getNormalizedTags(record: ProductionSongRecord) {
  const cached = normalizedTagCache.get(record.id);
  if (cached) return cached;

  const tags = getCanonicalTags(record).map(normalizeText);
  normalizedTagCache.set(record.id, tags);
  return tags;
}

function getCanonicalTags(record: ProductionSongRecord) {
  const cached = canonicalTagCache.get(record.id);
  if (cached) return cached;

  const tags = Array.from(
    new Set(record.tags.map(canonicalizeTag).filter((tag): tag is string => Boolean(tag)))
  );
  if (!tags.length) {
    const fallback = canonicalizeTag(record.packTitle) ?? canonicalizeTag(record.category);
    tags.push(fallback ?? displayTagName(record.packTitle));
  }
  canonicalTagCache.set(record.id, tags);
  return tags;
}

function getSearchFields(record: ProductionSongRecord) {
  const cached = searchFieldCache.get(record.id);
  if (cached) return cached;

  const fields = createSearchFields(record);
  searchFieldCache.set(record.id, fields);
  return fields;
}

export function matchesExploreFilter(record: ProductionSongRecord, filter: string) {
  const normalizedFilter = filter === "All" ? "All Genres" : filter;
  if (normalizedFilter === "All Genres") return true;

  const phrase = normalizeText(normalizedFilter);
  if (!phrase) return true;

  return getNormalizedTags(record).some((tag) => tag === phrase);
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

function findDirectTitleMatches(records: ProductionSongRecord[], query: string) {
  const phrase = normalizeText(query);
  const tokens = tokenize(query);
  if (!phrase) return [];

  const exactMatches = records.filter((record) => getSearchFields(record).title === phrase);
  if (exactMatches.length) return exactMatches;

  if (tokens.length < 2) return [];

  const prefixMatches = records.filter((record) => getSearchFields(record).title.startsWith(phrase));
  if (prefixMatches.length) return prefixMatches;

  return records.filter((record) => getSearchFields(record).title.includes(phrase));
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
    return getCategoryRank(leftFirst.category) - getCategoryRank(rightFirst.category) ||
      getPackRank(leftFirst.packTitle) - getPackRank(rightFirst.packTitle) ||
      leftFirst.category.localeCompare(rightFirst.category) ||
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
  if (cachedExploreGenres) return cachedExploreGenres;

  const counts = new Map<string, ExploreGenreOption>();

  for (const record of productionSongRecords) {
    if (!record.hasMp3) continue;

    for (const tag of getCanonicalTags(record)) {
      const normalizedTag = normalizeText(tag);

      const current = counts.get(normalizedTag);
      if (current) {
        current.count += 1;
      } else {
        counts.set(normalizedTag, {
          name: tag,
          count: 1,
          category: record.category,
        });
      }
    }
  }

  cachedExploreGenres = Array.from(counts.values())
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.category.localeCompare(right.category) ||
        right.count - left.count
    );

  return cachedExploreGenres;
}

export function getExploreCategories(): ExploreCategoryOption[] {
  if (cachedExploreCategories) return cachedExploreCategories;

  const counts = new Map<string, number>();

  for (const record of productionSongRecords) {
    if (!record.hasMp3) continue;
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  }

  cachedExploreCategories = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return cachedExploreCategories;
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

  const directTitleRecords = findDirectTitleMatches(scopedRecords, cleanQuery);
  if (directTitleRecords.length) {
    return {
      query: cleanQuery,
      genre: normalizedGenre,
      total: directTitleRecords.length,
      limit,
      tracks: directTitleRecords
        .slice(0, limit)
        .map((record, index) => recordToExploreTrack(record, index)),
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

export function searchExploreTitleMatches(query: string, genre = "All Genres", limit = MAX_RESULTS) {
  const normalizedGenre = genre === "All" ? "All Genres" : genre;
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  const scopedRecords = productionSongRecords
    .filter((record) => record.hasMp3)
    .filter((record) => matchesExploreFilter(record, normalizedGenre));
  const directTitleRecords = findDirectTitleMatches(scopedRecords, cleanQuery);

  if (!directTitleRecords.length) return null;

  return {
    query: cleanQuery,
    genre: normalizedGenre,
    total: directTitleRecords.length,
    limit,
    tracks: directTitleRecords
      .slice(0, limit)
      .map((record, index) => recordToExploreTrack(record, index)),
    genres: getExploreGenres(),
    categories: getExploreCategories(),
  } satisfies ExploreSearchResponse;
}
