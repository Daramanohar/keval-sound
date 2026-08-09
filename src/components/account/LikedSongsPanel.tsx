"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Download,
  Heart,
  ListPlus,
  LoaderCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Share2,
  ShoppingCart,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { useLikedSongs, type LikedSong } from "@/lib/liked-songs-context";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";

type SortMode = "recent" | "oldest" | "title" | "artist";

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "recent", label: "Recently liked" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A-Z" },
  { value: "artist", label: "Artist A-Z" },
];

function formatLikedDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function shuffleTracks(source: Track[]) {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export default function LikedSongsPanel() {
  const router = useRouter();
  const { likedSongs, likedCount, isLoading, error, removeLike, refresh } = useLikedSongs();
  const {
    isItemActive,
    isItemPlaying,
    playQueue,
    toggleTrack,
    addToQueue,
  } = usePlayerControls();
  const { addTrackToCart, isInCart, isOwned } = useStore();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const visibleSongs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matches = normalized
      ? likedSongs.filter(({ track, packTitle }) =>
          [track.title, track.artist, track.genre, packTitle, ...track.tags]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalized)
        )
      : likedSongs;

    return [...matches].sort((left, right) => {
      if (sortMode === "oldest") {
        return Date.parse(left.likedAt) - Date.parse(right.likedAt);
      }
      if (sortMode === "title") {
        return left.track.title.localeCompare(right.track.title);
      }
      if (sortMode === "artist") {
        return left.track.artist.localeCompare(right.track.artist);
      }
      return Date.parse(right.likedAt) - Date.parse(left.likedAt);
    });
  }, [likedSongs, query, sortMode]);

  const visibleTracks = useMemo(
    () => visibleSongs.map((item) => item.track),
    [visibleSongs]
  );
  const totalDuration = useMemo(
    () => likedSongs.reduce((total, item) => total + item.track.duration, 0),
    [likedSongs]
  );

  const startQueue = (shuffle = false) => {
    if (!visibleTracks.length) return;
    playQueue(shuffle ? shuffleTracks(visibleTracks) : visibleTracks);
  };

  const handleAddToCart = (item: LikedSong) => {
    const owned = item.owned || isOwned(item.track.id, "track");
    if (owned) {
      router.push("/account?tab=downloads");
      return;
    }
    if (item.saleStatus !== "AVAILABLE") {
      showToast({
        tone: "info",
        title: `${item.track.title} is sold out`,
        description: "This exclusive song remains available for streaming but cannot be purchased again.",
      });
      return;
    }

    const added = addTrackToCart(item.track);
    showToast({
      tone: added ? "success" : "info",
      title: added
        ? `${item.track.title} added to cart`
        : `${item.track.title} is already in your cart`,
      description: added
        ? `${formatPrice(item.track.price)} | MP3, WAV, license PDF, and invoice after payment`
        : "Open your cart when you are ready to complete checkout.",
    });
  };

  const shareTrack = async (track: Track) => {
    const url = `${window.location.origin}/song/${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `Listen to ${track.title} on Keval Sound`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      showToast({ tone: "info", title: "Track link ready to share" });
    } catch {
      // Closing the native share sheet is not an application error.
    }
  };

  return (
    <section aria-labelledby="liked-songs-title" className="overflow-hidden">
      <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#101122] px-5 py-7 sm:px-7 lg:py-9">
        <div className="absolute inset-y-0 left-0 w-1 bg-zesty-red" aria-hidden="true" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zesty-red text-white shadow-[0_12px_32px_rgba(244,63,48,0.2)] sm:h-20 sm:w-20">
              <Heart className="h-8 w-8 fill-current sm:h-9 sm:w-9" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dandelion">
                Your music library
              </p>
              <h2 id="liked-songs-title" className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Liked Songs
              </h2>
              <p className="mt-2 text-sm text-muted">
                {likedCount} {likedCount === 1 ? "song" : "songs"}
                {totalDuration > 0 ? ` | ${formatDuration(totalDuration)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startQueue(false)}
              disabled={!visibleTracks.length}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-dandelion px-5 text-sm font-bold text-vampire-black transition-[filter,transform] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </button>
            <button
              type="button"
              onClick={() => startQueue(true)}
              disabled={!visibleTracks.length}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-white/[0.09] bg-white/[0.05] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Shuffle className="h-4 w-4" />
              Shuffle
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-white/[0.06] bg-[#0c0d1c] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <span className="sr-only">Search Liked Songs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, artist, album, or tag"
              className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.035] pl-10 pr-10 text-sm text-white outline-none placeholder:text-muted/55 focus:border-dandelion/45 focus:ring-2 focus:ring-dandelion/10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear Liked Songs search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-11 rounded-md border border-white/[0.08] bg-[#141529] px-3 text-sm text-white outline-none focus:border-dandelion/45"
              aria-label="Sort Liked Songs"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-[#0a0b18]">
        {isLoading ? <LikedSongsSkeleton /> : null}

        {!isLoading && error ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 py-12 text-center">
            <AlertCircle className="h-7 w-7 text-zesty-red" />
            <p className="mt-3 text-sm font-semibold text-white">Liked Songs could not be loaded</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/[0.1]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : null}

        {!isLoading && !error && likedSongs.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted">
              <Music2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Your Liked Songs will live here</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Tap the heart on any song to build a personal collection you can play, shuffle, and license later.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex h-11 items-center rounded-md bg-dandelion px-5 text-sm font-bold text-vampire-black hover:brightness-105"
            >
              Explore music
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && likedSongs.length > 0 && visibleSongs.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 py-12 text-center">
            <Search className="h-6 w-6 text-muted" />
            <p className="mt-3 text-sm font-semibold text-white">No liked songs match &quot;{query}&quot;</p>
            <button type="button" onClick={() => setQuery("")} className="mt-3 text-sm font-semibold text-dandelion hover:text-white">
              Clear search
            </button>
          </div>
        ) : null}

        {!isLoading && !error && visibleSongs.length > 0 ? (
          <div>
            <div className="hidden grid-cols-[44px_minmax(220px,1.5fr)_minmax(130px,.8fr)_110px_70px_96px] gap-3 border-b border-white/[0.05] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted/55 md:grid sm:px-6">
              <span>#</span>
              <span>Song</span>
              <span>Album</span>
              <span>Liked</span>
              <span className="text-right">Time</span>
              <span className="sr-only">Actions</span>
            </div>
            <div className="divide-y divide-white/[0.045]">
              {visibleSongs.map((item, index) => {
                const active = isItemActive(item.track.id, "track");
                const playing = isItemPlaying(item.track.id, "track");
                const owned = item.owned || isOwned(item.track.id, "track");
                const carted = isInCart(item.track.id, "track");

                return (
                  <div
                    key={item.track.id}
                    className={cn(
                      "group grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.035] md:grid-cols-[44px_minmax(220px,1.5fr)_minmax(130px,.8fr)_110px_70px_96px] sm:px-6",
                      active && "bg-dandelion/[0.035]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTrack(item.track, { queue: visibleTracks })}
                      aria-label={playing ? `Pause ${item.track.title}` : `Play ${item.track.title}`}
                      className="relative flex h-10 w-10 items-center justify-center rounded-md text-xs text-muted outline-none focus-visible:ring-2 focus-visible:ring-dandelion"
                    >
                      <span className={cn("transition-opacity group-hover:opacity-0", active && "text-dandelion")}>{index + 1}</span>
                      <span className={cn("absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100", active && "opacity-100 text-dandelion")}>
                        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                      </span>
                    </button>

                    <div className="flex min-w-0 items-center gap-3">
                      <TrackArtwork track={item.track} />
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-semibold", active ? "text-dandelion" : "text-white")}>{item.track.title}</p>
                        <p className="mt-1 truncate text-xs text-muted">{item.track.artist}</p>
                        <p className="mt-1 truncate text-[10px] text-muted/60 md:hidden">{item.packTitle}</p>
                      </div>
                    </div>

                    <p className="hidden truncate text-xs text-muted md:block">{item.packTitle}</p>
                    <p className="hidden text-xs text-muted md:block">{formatLikedDate(item.likedAt)}</p>
                    <p className="hidden text-right text-xs tabular-nums text-muted md:block">{formatDuration(item.track.duration)}</p>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void removeLike(item.track)}
                        aria-label={`Remove ${item.track.title} from Liked Songs`}
                        title="Remove from Liked Songs"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-zesty-red outline-none transition-colors hover:bg-zesty-red/10 focus-visible:ring-2 focus-visible:ring-dandelion"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                      <TrackActionsMenu
                        item={item}
                        owned={owned}
                        carted={carted}
                        onQueue={() => {
                          addToQueue(item.track);
                          showToast({ tone: "info", title: `${item.track.title} added to queue` });
                        }}
                        onCart={() => handleAddToCart(item)}
                        onShare={() => void shareTrack(item.track)}
                        onRemove={() => void removeLike(item.track)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TrackArtwork({ track }: { track: Track }) {
  return (
    <div className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br", track.coverUrl)}>
      {track.coverUrl.startsWith("/") ? (
        <Image src={track.coverUrl} alt="" fill sizes="48px" className="object-cover" />
      ) : (
        <Music2 className="absolute inset-0 m-auto h-4 w-4 text-white/50" />
      )}
    </div>
  );
}

function TrackActionsMenu({
  item,
  owned,
  carted,
  onQueue,
  onCart,
  onShare,
  onRemove,
}: {
  item: LikedSong;
  owned: boolean;
  carted: boolean;
  onQueue: () => void;
  onCart: () => void;
  onShare: () => void;
  onRemove: () => void;
}) {
  const closeAndRun = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  };

  return (
    <details className="group/menu relative">
      <summary
        aria-label={`More actions for ${item.track.title}`}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute bottom-10 right-0 z-30 w-52 overflow-hidden rounded-md border border-white/[0.09] bg-[#17182b] p-1.5 shadow-2xl shadow-black/50">
        <MenuAction icon={ListPlus} label="Add to queue" onClick={(event) => closeAndRun(event, onQueue)} />
        <MenuAction icon={Share2} label="Share" onClick={(event) => closeAndRun(event, onShare)} />
        <MenuAction
          icon={owned ? Download : ShoppingCart}
          label={owned ? "Open downloads" : item.saleStatus !== "AVAILABLE" ? "Sold out" : carted ? "Open cart" : "Add to cart"}
          onClick={(event) => closeAndRun(event, onCart)}
        />
        <div className="my-1 h-px bg-white/[0.06]" />
        <MenuAction icon={Trash2} label="Remove from Liked Songs" danger onClick={(event) => closeAndRun(event, onRemove)} />
      </div>
    </details>
  );
}

function MenuAction({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: typeof ListPlus;
  label: string;
  danger?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-xs transition-colors",
        danger ? "text-zesty-red hover:bg-zesty-red/10" : "text-light-grey hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LikedSongsSkeleton() {
  return (
    <div className="divide-y divide-white/[0.045]" aria-label="Loading Liked Songs">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <LoaderCircle className="mx-auto h-4 w-4 animate-spin text-muted/35" />
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-md bg-white/[0.05]" />
            <div className="flex-1">
              <div className="h-3 w-40 max-w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="h-8 w-16 animate-pulse rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
