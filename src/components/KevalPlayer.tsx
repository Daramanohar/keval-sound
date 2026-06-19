"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
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
import type { Track } from "@/lib/mock-data";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import type { ProductionPack, ProductionTrack } from "@/lib/production-catalog";
import { preloadProductionCatalog } from "@/lib/production-catalog-preload";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import KevalPlayerLoading from "./KevalPlayerLoading";
import TrackTagLine from "./TrackTagLine";

const PLAYER_SEARCH_LIMIT = 72;
const MIXED_PLAYER_LIMIT = 96;
const MIXED_SOURCE_CATEGORIES = new Set(["Culture", "Occasion"]);

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

  const mixedTracks = useMemo(() => {
    if (!catalog) return [];

    const sourceTracks = catalog.productionPacks
      .filter((pack) => MIXED_SOURCE_CATEGORIES.has(pack.category))
      .flatMap((pack) => pack.tracks);

    return stableShuffle(sourceTracks, "keval-player-mixed-feed").slice(0, MIXED_PLAYER_LIMIT);
  }, [catalog]);

  const hasQuery = deferredQuery.trim().length > 0;
  const activeSearchPayload = useMemo(() => {
    const cleanQuery = deferredQuery.trim();
    if (!cleanQuery || !searchPayload) return null;

    return searchPayload.query === cleanQuery || searchPayload.originalQuery === cleanQuery
      ? searchPayload
      : null;
  }, [deferredQuery, searchPayload]);
  const activeTracks = hasQuery ? activeSearchPayload?.tracks ?? [] : mixedTracks;

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

  const getPackForTrack = (track: Track): ProductionPack | null => {
    if (!isProductionTrack(track)) return null;
    return packsById.get(track.packId) ?? null;
  };

  const handlePlay = (track: Track, queue: Track[] = activeTracks) => {
    if (!track.audioUrl) {
      showToast({
        tone: "info",
        title: "Cloud stream pending",
        description: "This production track is indexed. Its secured MP3 stream is not available yet.",
      });
      return;
    }

    const pack = getPackForTrack(track);
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
      title: "WAV review access",
      description: "Temporary teammate review access is enabled separately until paid WAV plans go live.",
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
        <div className="relative z-10 flex min-h-[292px] flex-col justify-between p-6 md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vivid-blue/15 text-vivid-blue">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vivid-blue">
                    Keval listening room
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                    Search, preview, and keep the music moving.
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Mixed creator stream", "Smart catalog search", "Secured MP3 previews"].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-vampire-black transition-transform hover:scale-[1.02]"
            >
              <Lock className="h-4 w-4" />
              WAV Review Access
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 max-w-4xl">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 shadow-2xl shadow-black/20 transition-colors focus-within:border-vivid-blue/60 focus-within:bg-white/[0.075]">
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
                  aria-label="Clear search"
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
            </div>
          </form>
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        {hasQuery ? (
          <motion.section
            key="smart-search"
            initial={{ opacity: 0, y: 18, rotateX: -3 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -12, rotateX: 3 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="space-y-5"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <SectionTitle
                title="Smart Search Matches"
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

            {isSearching && !activeTracks.length ? (
              <SearchLoading />
            ) : activeTracks.length ? (
              <TrackGrid
                tracks={activeTracks}
                getPackForTrack={getPackForTrack}
                isItemPlaying={isItemPlaying}
                onPlay={handlePlay}
                onAddToCart={handleAddToCart}
                isSaved={(track) => isInWishlist(track.id, "track")}
                onToggleSave={toggleTrackWishlist}
              />
            ) : (
              <EmptyState label="No matches yet. Try a different mood, scene, instrument, or song title." />
            )}
          </motion.section>
        ) : (
          <motion.section
            key="mixed-stream"
            initial={{ opacity: 0, y: 18, rotateX: -3 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -12, rotateX: 3 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="space-y-5"
            style={{ transformStyle: "preserve-3d" }}
          >
            <SectionTitle
              title="Mixed Creator Stream"
              subtitle="A shuffled listening shelf from culture-driven and creator-use collections. Pick any track and keep moving."
            />
            <TrackGrid
              tracks={mixedTracks}
              getPackForTrack={getPackForTrack}
              isItemPlaying={isItemPlaying}
              onPlay={handlePlay}
              onAddToCart={handleAddToCart}
              isSaved={(track) => isInWishlist(track.id, "track")}
              onToggleSave={toggleTrackWishlist}
            />
          </motion.section>
        )}
      </AnimatePresence>
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

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

function TrackGrid({
  tracks,
  getPackForTrack,
  isItemPlaying,
  onPlay,
  onAddToCart,
  isSaved,
  onToggleSave,
}: {
  tracks: Track[];
  getPackForTrack: (track: Track) => ProductionPack | null;
  isItemPlaying: (id: string, type?: "track" | "sample") => boolean;
  onPlay: (track: Track, queue?: Track[]) => void;
  onAddToCart: (track: Track) => void;
  isSaved: (track: Track) => boolean;
  onToggleSave: (track: Track) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tracks.map((track, index) => (
        <TrackCard
          key={track.id}
          track={track}
          pack={getPackForTrack(track)}
          queue={tracks}
          index={index}
          isPlaying={isItemPlaying(track.id, "track")}
          saved={isSaved(track)}
          onPlay={onPlay}
          onAddToCart={onAddToCart}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}

function TrackCard({
  track,
  pack,
  queue,
  index,
  isPlaying,
  saved,
  onPlay,
  onAddToCart,
  onToggleSave,
}: {
  track: Track;
  pack: ProductionPack | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  saved: boolean;
  onPlay: (track: Track, queue?: Track[]) => void;
  onAddToCart: (track: Track) => void;
  onToggleSave: (track: Track) => void;
}) {
  const packLabel = pack?.title ?? track.genre;
  const delayed = index < 16;

  return (
    <motion.article
      initial={delayed ? { opacity: 0, y: 18 } : false}
      animate={delayed ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.28, delay: delayed ? index * 0.018 : 0 }}
      className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.035] transition-transform duration-300 hover:-translate-y-1 hover:border-vivid-blue/25"
      style={{ contentVisibility: "auto", containIntrinsicSize: "330px" }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.04]">
        <Image
          src={track.coverUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/85 via-vampire-black/18 to-transparent" />
        <button
          type="button"
          onClick={() => onPlay(track, queue)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-vampire-black shadow-xl transition-transform hover:scale-105"
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
          {track.language === "Instrumental" ? "Instrumental" : "Track"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-base font-bold text-white">{track.title}</h3>
              <p className="mt-1 truncate text-xs text-muted">{packLabel}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-vivid-blue">
              {formatPrice(track.price)}
            </span>
          </div>
          <TrackTagLine track={track} className="mt-2 gap-x-2 text-[11px]" />
          <p className="mt-3 text-[11px] text-muted/70">
            {formatDuration(track.duration)} - Key {track.key}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPlay(track, queue)}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
              isPlaying
                ? "bg-white text-vampire-black"
                : "bg-white/[0.07] text-white hover:bg-white/[0.11]"
            )}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Playing" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => onAddToCart(track)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-vivid-blue/15 text-sm font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/25"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(track)}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.06] text-muted hover:text-white"
            )}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
        </div>
      </div>
    </motion.article>
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
