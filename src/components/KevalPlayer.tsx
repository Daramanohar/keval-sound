"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Headphones,
  Heart,
  Loader2,
  Lock,
  Pause,
  Play,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import { searchExploreTracks } from "@/lib/explore-search";
import type { Track } from "@/lib/mock-data";
import { CURATED_PLAYLISTS, type CuratedPlaylistDefinition } from "@/lib/playlist-catalog";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import type { ProductionPack, ProductionTrack } from "@/lib/production-catalog";
import { preloadProductionCatalog } from "@/lib/production-catalog-preload";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import KevalPlayerLoading from "./KevalPlayerLoading";
import TrackTagLine from "./TrackTagLine";

const PLAYER_SEARCH_LIMIT = 72;
const ROW_TRACK_LIMIT = 24;
const MIXED_SOURCE_CATEGORIES = new Set(["Culture", "Occasion"]);

const STREAM_ROWS: Array<{
  title: string;
  subtitle: string;
  tokens: string[];
  seed: string;
}> = [
  {
    title: "Culture Pop Starters",
    subtitle: "Bright creator-ready hooks, warm vocals, and commercial-friendly pop motion.",
    tokens: ["pop", "bright", "commercial", "creator"],
    seed: "culture-pop",
  },
  {
    title: "Wedding Film Glow",
    subtitle: "Elegant, emotional, cinematic cues for ceremonies, reels, and memory films.",
    tokens: ["wedding", "romantic", "cinematic", "emotional"],
    seed: "wedding-film",
  },
  {
    title: "City Night Cuts",
    subtitle: "Urban edits, late-night frames, hip-hop pulse, R&B warmth, and trap edges.",
    tokens: ["urban", "night", "hip-hop", "rap", "r&b", "trap"],
    seed: "city-night",
  },
  {
    title: "Cinematic Story Beds",
    subtitle: "Movie-minded background beds for drama, documentaries, trailers, and slow reveals.",
    tokens: ["cinematic", "orchestral", "soundtrack", "film", "trailer"],
    seed: "cinematic-story",
  },
  {
    title: "Desi Motion Picks",
    subtitle: "Indian textures, Bollywood color, regional energy, and modern fusion movement.",
    tokens: ["desi", "hindi", "bollywood", "indian", "fusion"],
    seed: "desi-motion",
  },
  {
    title: "Soft Focus Backgrounds",
    subtitle: "Clean, calm, useful background music for voiceovers, tutorials, and quiet edits.",
    tokens: ["ambient", "soft", "calm", "focus", "background"],
    seed: "soft-focus",
  },
  {
    title: "High Energy Frames",
    subtitle: "Fast-moving tracks for workouts, sports edits, promos, and energetic cuts.",
    tokens: ["energetic", "workout", "hype", "driving", "festival"],
    seed: "high-energy",
  },
  {
    title: "Acoustic Warm Scenes",
    subtitle: "Organic guitars, intimate warmth, folk shades, and human-feeling creator beds.",
    tokens: ["acoustic", "guitar", "warm", "folk", "indie"],
    seed: "acoustic-warm",
  },
  {
    title: "Luxury Reel Polish",
    subtitle: "Smooth, premium-feeling music for fashion, venues, brands, and polished reels.",
    tokens: ["luxury", "premium", "smooth", "commercial", "brand"],
    seed: "luxury-reel",
  },
  {
    title: "Festival And Dance Spark",
    subtitle: "Dancefloor movement, celebration energy, and upbeat creator momentum.",
    tokens: ["dance", "festival", "edm", "club", "celebratory"],
    seed: "festival-dance",
  },
  {
    title: "Emotional Underscore",
    subtitle: "Heartfelt, reflective, romantic, and sentimental beds for story-led visuals.",
    tokens: ["emotional", "heartfelt", "romantic", "melancholic", "love"],
    seed: "emotional-underscore",
  },
  {
    title: "Dark Trailer Energy",
    subtitle: "Tension, shadows, dramatic movement, and suspenseful cuts for heavier scenes.",
    tokens: ["dark", "dramatic", "tension", "thriller", "trailer"],
    seed: "dark-trailer",
  },
  {
    title: "Creator BGM Essentials",
    subtitle: "Reliable background music for vlogs, explainers, podcasts, and everyday content.",
    tokens: ["background", "creator", "vlog", "content", "podcast"],
    seed: "creator-bgm",
  },
  {
    title: "Indian Epic Moments",
    subtitle: "Big cinematic Indian cues with drama, scale, orchestral lift, and emotion.",
    tokens: ["epic", "indian", "orchestral", "cinematic", "dramatic"],
    seed: "indian-epic",
  },
  {
    title: "Chill Lo-Fi Rooms",
    subtitle: "Low-pressure grooves for study, relaxed edits, soft rooms, and mellow loops.",
    tokens: ["lo-fi", "lofi", "chill", "study", "mellow"],
    seed: "chill-lofi",
  },
  {
    title: "Percussion And Groove",
    subtitle: "Rhythmic movement, drums, hand percussion, swing, and groove-forward tracks.",
    tokens: ["drum", "percussion", "groove", "rhythm", "swing"],
    seed: "percussion-groove",
  },
];

type CuratedPlaylist = CuratedPlaylistDefinition & {
  tracks: Track[];
};

type ProductionCatalogModule = typeof import("@/lib/production-catalog");

type PlayerSearchPayload = {
  query: string;
  originalQuery?: string;
  optimizedQuery?: string;
  acknowledgement?: string;
  searchMode?: "metadata" | "vector";
  vectorReady?: boolean;
  total: number;
  limit: number;
  offset: number;
  tracks: Track[];
};

function isProductionTrack(track: Track): track is ProductionTrack {
  return "packId" in track;
}

function normalizePlayerText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function stableShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort(
    (left, right) => hashString(`${seed}:${left.id}`) - hashString(`${seed}:${right.id}`)
  );
}

function trackMatchesTokens(track: ProductionTrack, tokens: string[]) {
  const haystack = normalizePlayerText(
    [
      track.title,
      track.genre,
      track.mood,
      track.packTitle,
      track.category,
      track.tags.join(" "),
      track.searchText,
    ].join(" ")
  );

  return tokens.some((token) => haystack.includes(normalizePlayerText(token)));
}

export default function KevalPlayer() {
  const [catalog, setCatalog] = useState<ProductionCatalogModule | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchPayload, setSearchPayload] = useState<PlayerSearchPayload | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { toggleTrack, isItemPlaying } = usePlayerControls();
  const { addTrackToCart, isInWishlist, toggleTrackWishlist } = useStore();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    preloadProductionCatalog().then((module) => {
      if (!cancelled) setCatalog(module);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const packsById = useMemo(() => {
    const map = new Map<string, ProductionPack>();

    catalog?.productionPacks.forEach((pack) => {
      map.set(pack.id, pack);
    });

    return map;
  }, [catalog]);
  const mixedSourceTracks = useMemo(
    () =>
      catalog?.productionPacks
        .filter((pack) => MIXED_SOURCE_CATEGORIES.has(pack.category))
        .flatMap((pack) => pack.tracks) ?? [],
    [catalog]
  );
  const streamRows = useMemo(
    () =>
      STREAM_ROWS.map((row, rowIndex) => {
        const matchingTracks = mixedSourceTracks.filter((track) =>
          trackMatchesTokens(track, row.tokens)
        );
        const fallbackTracks = stableShuffle(mixedSourceTracks, `${row.seed}:fallback`);
        const filledTracks = [
          ...stableShuffle(matchingTracks, row.seed),
          ...fallbackTracks.filter((track) => !matchingTracks.some((match) => match.id === track.id)),
        ].slice(0, ROW_TRACK_LIMIT);

        return {
          ...row,
          index: rowIndex,
          tracks: filledTracks,
        };
      }).filter((row) => row.tracks.length > 0),
    [mixedSourceTracks]
  );
  const curatedPlaylists = useMemo<CuratedPlaylist[]>(
    () =>
      CURATED_PLAYLISTS.map((playlist) => {
        const result = searchExploreTracks("", playlist.tag, 24);

        return {
          ...playlist,
          tracks: result.tracks,
        };
      }),
    []
  );
  const activeSearchPayload = useMemo(() => {
    const cleanQuery = deferredQuery.trim();
    if (!cleanQuery || !searchPayload) return null;

    return searchPayload.query === cleanQuery || searchPayload.originalQuery === cleanQuery
      ? searchPayload
      : null;
  }, [deferredQuery, searchPayload]);
  const searchResults = activeSearchPayload?.tracks ?? [];

  useEffect(() => {
    const cleanQuery = deferredQuery.trim();
    if (!cleanQuery) return;

    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setIsSearching(true);
      setSearchError(null);
    });

    const params = new URLSearchParams({
      q: cleanQuery,
      limit: String(PLAYER_SEARCH_LIMIT),
    });

    fetch(`/api/explore/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search failed with ${response.status}`);
        }

        return (await response.json()) as PlayerSearchPayload;
      })
      .then((payload) => {
        setSearchPayload(payload);
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setSearchPayload(null);
        setSearchError("Search is warming up. Try again in a moment.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });

    return () => controller.abort();
  }, [deferredQuery]);

  const findPackForTrack = (track: Track): ProductionPack | null => {
    if (!isProductionTrack(track)) return null;
    return packsById.get(track.packId) ?? null;
  };

  const handlePlay = (track: Track, queue: Track[] = [track]) => {
    if (!track.audioUrl) {
      showToast({
        tone: "info",
        title: "Cloud stream pending",
        description: "This production song is indexed. Its secured MP3 stream is not available yet.",
      });
      return;
    }

    const pack = findPackForTrack(track);
    toggleTrack(track, { queue, pack: pack ?? undefined });
  };

  const handleAddToCart = (track: Track) => {
    const added = addTrackToCart(track);

    showToast(
      added
        ? {
            title: `${track.title} added to cart`,
            description: `${track.artist} - ${formatPrice(track.price)}`,
          }
        : {
            tone: "info",
            title: `${track.title} is already in your cart`,
            description: "Open the cart when you are ready to license it.",
          }
    );
  };

  const handleUpgrade = () => {
    showToast({
      tone: "info",
      title: "WAV streaming tier",
      description: "The ₹49 Player subscription gate will unlock here after auth and payments are wired.",
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  if (!catalog) {
    return <KevalPlayerLoading />;
  }

  return (
    <div className="min-h-[calc(100vh-96px)] space-y-8 pb-28">
      <motion.section
        initial={{ opacity: 0, y: 18, rotateX: -4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0c18]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,125,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(137,62,138,0.12),transparent_38%)]" />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vivid-blue/15 text-vivid-blue">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vivid-blue">
                    Keval Playlists
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                    Curated playlists. Listen first, license when it lands.
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Keval team curated",
                  "Production catalog",
                  "Cloud-secured previews",
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-vampire-black transition-transform hover:scale-[1.02]"
            >
              <Lock className="h-4 w-4" />
              ₹49 WAV Player
            </button>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_280px]">
            <form
              onSubmit={handleSubmit}
              className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 shadow-2xl shadow-black/20 transition-colors focus-within:border-vivid-blue/60 focus-within:bg-white/[0.075]"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-vivid-blue" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a song name, mood, scene, instrument, or creator brief"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Clear playlist search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="submit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vivid-blue/15 text-vivid-blue transition-colors hover:bg-vivid-blue/25"
                aria-label="Search playlists"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
            <div className="grid grid-cols-3 rounded-xl border border-white/[0.06] bg-white/[0.04]">
              <StatCell label="Packs" value={catalog.productionCatalogStats.packsReady} />
              <StatCell label="MP3" value={catalog.productionCatalogStats.mp3Tracks} />
              <StatCell label="WAV" value={catalog.productionCatalogStats.wavTracks} />
            </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-4">
        <SectionTitle
          title="Playlists curated by the Keval team"
          subtitle="Handpicked tag-based collections. Open any playlist to see the same songs surfaced from Explore for that sound."
        />
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {curatedPlaylists.map((playlist, index) => (
            <PlaylistCard
              key={playlist.tag}
              playlist={playlist}
              index={index}
              isItemPlaying={isItemPlaying}
              onPlay={(track) => handlePlay(track, playlist.tracks)}
              onAddToCart={handleAddToCart}
              isSaved={(track) => isInWishlist(track.id, "track")}
              onToggleSave={toggleTrackWishlist}
            />
          ))}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {query.trim() ? (
          <motion.section
            key="playlist-search"
            initial={{ opacity: 0, y: 18, rotateX: -3 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -12, rotateX: 3 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="space-y-4"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <SectionTitle
                title="Search Matches"
                subtitle={
                  activeSearchPayload?.acknowledgement ??
                  `Finding the closest Keval tracks for "${deferredQuery.trim()}".`
                }
              />
              <SearchModePill
                loading={isSearching}
                vectorReady={activeSearchPayload?.vectorReady}
                mode={activeSearchPayload?.searchMode}
              />
            </div>

            {searchError ? <EmptyState label={searchError} /> : null}

            {isSearching && !searchResults.length ? (
              <SearchLoading />
            ) : searchResults.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {searchResults.map((track) => (
                  <SearchResultRow
                    key={track.id}
                    track={track}
                    pack={findPackForTrack(track)}
                    queue={searchResults}
                    isPlaying={isItemPlaying(track.id, "track")}
                    onPlay={handlePlay}
                    onAddToCart={() => handleAddToCart(track)}
                    saved={isInWishlist(track.id, "track")}
                    onToggleSave={() => toggleTrackWishlist(track)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState label="No matches yet. Try a different mood, scene, instrument, or song title." />
            )}
          </motion.section>
        ) : (
          <motion.section
            key="playlist-rows"
            initial={{ opacity: 0, y: 18, rotateX: -3 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -12, rotateX: 3 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="space-y-8"
            style={{ transformStyle: "preserve-3d" }}
          >
            <SectionTitle
              title="Creator Streaming Rows"
              subtitle="Mixed horizontal shelves from culture-led and creator-use music, arranged so each row feels different."
            />

            {streamRows.map((row) => (
              <StreamRow
                key={row.seed}
                row={row}
                isItemPlaying={isItemPlaying}
                onPlay={handlePlay}
                onAddToCart={handleAddToCart}
                isSaved={(track) => isInWishlist(track.id, "track")}
                onToggleSave={toggleTrackWishlist}
              />
            ))}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaylistCard({
  playlist,
  index,
  isItemPlaying,
  onPlay,
  onAddToCart,
  isSaved,
  onToggleSave,
}: {
  playlist: CuratedPlaylist;
  index: number;
  isItemPlaying: (id: string, type?: "track" | "sample") => boolean;
  onPlay: (track: Track) => void;
  onAddToCart: (track: Track) => void;
  isSaved: (track: Track) => boolean;
  onToggleSave: (track: Track) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const leadTrack = playlist.tracks[0];
  const active = playlist.tracks.some((track) => isItemPlaying(track.id, "track"));

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.35 }}
      className="glass-card flex flex-col overflow-hidden rounded-2xl"
    >
      <Link
        href={`/playlists/${playlist.slug}`}
        className="group relative aspect-square w-full overflow-hidden bg-white/[0.04]"
        aria-label={`Open ${playlist.title} playlist`}
      >
        <Image
          src={playlist.coverUrl}
          alt={playlist.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/85 via-vampire-black/10 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/75 backdrop-blur">
          {playlist.tag}
        </span>
        <div className="absolute bottom-3 left-3 right-3 text-left">
          <p className="text-base font-bold leading-tight text-white">{playlist.title}</p>
          <p className="mt-1 text-[11px] text-white/65">Curated by Keval team</p>
        </div>
      </Link>

      <div className="space-y-3 p-3">
        <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-muted">
          {playlist.description}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => leadTrack && onPlay(leadTrack)}
            disabled={!leadTrack}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-vivid-blue/10 px-3 py-2 text-xs font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            {active ? "Pause" : "Play"}
          </button>
          <Link
            href={`/playlists/${playlist.slug}`}
            className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            Open
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              expanded
                ? "bg-vivid-blue/15 text-vivid-blue"
                : "bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-white/[0.04] p-2">
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1 scrollbar-hide">
            {playlist.tracks.map((track, trackIndex) => {
              const trackPlaying = isItemPlaying(track.id, "track");
              const saved = isSaved(track);

              return (
                <div
                  key={track.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                >
                  <button
                    type="button"
                    onClick={() => onPlay(track)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-colors group-hover:bg-vivid-blue/20"
                    aria-label={trackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  >
                    {trackPlaying ? (
                      <Pause className="h-2.5 w-2.5 text-vivid-blue" />
                    ) : (
                      <Play className="ml-0.5 h-2.5 w-2.5 text-muted" />
                    )}
                  </button>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/[0.04]">
                    <Image src={track.coverUrl} alt="" fill sizes="32px" className="object-cover" />
                  </div>
                  <span className="w-4 shrink-0 text-center text-[9px] text-muted/50">
                    {trackIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white">{track.title}</p>
                    <TrackTagLine track={track} className="mt-0.5 gap-x-1.5 text-[9px] text-muted/45" />
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSave(track)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                      saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.05] text-muted hover:text-white"
                    )}
                    aria-label={saved ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  >
                    <Heart className={cn("h-3 w-3", saved && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddToCart(track)}
                    className="shrink-0 rounded-md bg-vivid-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/20"
                  >
                    ₹99
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col justify-center border-r border-white/[0.05] px-3 py-2 last:border-r-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <span className="text-base font-bold text-white">{value.toLocaleString("en-IN")}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function SearchModePill({
  loading,
  vectorReady,
  mode,
}: {
  loading: boolean;
  vectorReady?: boolean;
  mode?: "metadata" | "vector";
}) {
  const label = loading
    ? "Searching"
    : vectorReady && mode === "vector"
      ? "Smart discovery"
      : "Catalog discovery";

  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-vivid-blue/20 bg-vivid-blue/10 px-3 py-1.5 text-xs font-semibold text-vivid-blue">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function StreamRow({
  row,
  isItemPlaying,
  onPlay,
  onAddToCart,
  isSaved,
  onToggleSave,
}: {
  row: {
    title: string;
    subtitle: string;
    seed: string;
    index: number;
    tracks: Track[];
  };
  isItemPlaying: (id: string, type?: "track" | "sample") => boolean;
  onPlay: (track: Track, queue?: Track[]) => void;
  onAddToCart: (track: Track) => void;
  isSaved: (track: Track) => boolean;
  onToggleSave: (track: Track) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotateX: -2 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "80px" }}
      transition={{ duration: 0.3, delay: Math.min(row.index * 0.025, 0.18) }}
      className="space-y-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "360px", transformStyle: "preserve-3d" }}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-white">{row.title}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">{row.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide overscroll-x-contain">
        {row.tracks.map((track) => (
          <TrackTile
            key={`${row.seed}-${track.id}`}
            track={track}
            queue={row.tracks}
            isPlaying={isItemPlaying(track.id, "track")}
            saved={isSaved(track)}
            onPlay={onPlay}
            onAddToCart={onAddToCart}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </motion.div>
  );
}

function TrackTile({
  track,
  queue,
  isPlaying,
  saved,
  onPlay,
  onAddToCart,
  onToggleSave,
}: {
  track: Track;
  queue: Track[];
  isPlaying: boolean;
  saved: boolean;
  onPlay: (track: Track, queue?: Track[]) => void;
  onAddToCart: (track: Track) => void;
  onToggleSave: (track: Track) => void;
}) {
  return (
    <article className="group w-[174px] shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035] transition-transform duration-300 hover:-translate-y-1 hover:border-vivid-blue/25">
      <div className="relative aspect-square overflow-hidden bg-white/[0.04]">
        <Image
          src={track.coverUrl}
          alt=""
          fill
          sizes="180px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/80 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => onPlay(track, queue)}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-vampire-black shadow-xl transition-transform hover:scale-105"
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        {!track.audioUrl ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase text-white/75 backdrop-blur">
            Sync
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-full bg-white/[0.14] px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {track.language === "Instrumental" ? "Instrumental" : "Track"}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="min-h-[44px]">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{track.title}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{track.mood}</p>
          <TrackTagLine track={track} className="mt-1 gap-x-1.5 text-[10px] text-muted/50" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(track)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.06] text-muted hover:text-white"
            )}
            aria-label={saved ? "Remove from Liked Songs" : "Add to Liked Songs"}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={() => onAddToCart(track)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full bg-vivid-blue/15 px-3 text-xs font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/25"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            ₹99
          </button>
        </div>
      </div>
    </article>
  );
}

function SearchResultRow({
  track,
  pack,
  queue,
  isPlaying,
  saved,
  onPlay,
  onAddToCart,
  onToggleSave,
}: {
  track: Track;
  pack: ProductionPack | null;
  queue: Track[];
  isPlaying: boolean;
  saved: boolean;
  onPlay: (track: Track, queue?: Track[]) => void;
  onAddToCart: () => void;
  onToggleSave: () => void;
}) {
  return (
    <article className="flex min-w-0 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
        <Image src={track.coverUrl} alt="" fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
        <p className="truncate text-xs text-muted">
          {pack?.title ?? track.genre} - {track.mood} - {formatDuration(track.duration)}
        </p>
        <TrackTagLine track={track} className="mt-2 text-[10px] text-white/55" />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleSave()}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.06] text-muted hover:text-white"
          )}
          aria-label={saved ? "Remove from Liked Songs" : "Add to Liked Songs"}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-white sm:flex"
          aria-label="Add to cart"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPlay(track, queue)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-vampire-black transition-transform hover:scale-105"
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

function SearchLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-muted">
      <div className="inline-flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-vivid-blue" />
        Searching the Keval music library...
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.025] px-5 py-8 text-center text-sm text-muted">
      {label}
    </div>
  );
}
