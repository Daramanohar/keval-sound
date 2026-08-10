"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Pause,
  Play,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import TrackTagLine from "@/components/TrackTagLine";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { searchExploreTracks } from "@/lib/explore-search";
import { usePlayerControls } from "@/lib/player-context";
import type { CuratedPlaylistDefinition } from "@/lib/playlist-catalog";
import { useSongDetail } from "@/lib/song-detail-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { cn, formatDuration, formatPrice, resampleWaveform } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";

const FULL_PLAYLIST_LIMIT = 5000;

export default function PlaylistDetailClient({
  playlist,
}: {
  playlist: CuratedPlaylistDefinition;
}) {
  const tracks = useMemo(
    () => searchExploreTracks("", playlist.tag, FULL_PLAYLIST_LIMIT).tracks,
    [playlist.tag]
  );
  const { toggleTrack, isItemPlaying } = usePlayerControls();
  const { addTrackToCart, isInCart, isInWishlist, toggleTrackWishlist } = useStore();
  const { showToast } = useToast();
  const { openSong } = useSongDetail();
  const leadTrack = tracks[0] ?? null;
  const hasActiveTrack = tracks.some((track) => isItemPlaying(track.id, "track"));

  const handlePlayTrack = (track: Track) => {
    if (!track.audioUrl) {
      showToast({
        tone: "info",
        title: "Cloud stream pending",
        description: "This song is indexed, but the MP3 stream is not available yet.",
      });
      return;
    }

    toggleTrack(track, { queue: tracks });
  };

  const handleAddToCart = (track: Track) => {
    const added = addTrackToCart(track);
    showToast(
      added
        ? {
            title: `${track.title} added to cart`,
            description: `${track.artist} - ${formatPrice(track.price)}`,
          }
        : { tone: "info", title: `${track.title} is already in your cart` }
    );
  };

  return (
    <div className="min-h-[calc(100vh-96px)] pb-28">
      <Link
        href="/playlists"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted/70 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Playlists
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-7 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0c18]"
      >
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[260px_1fr] lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,125,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(232,35,38,0.13),transparent_42%)]" />
          <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl bg-white/[0.04] shadow-2xl shadow-black/40">
            <Image
              src={playlist.coverUrl}
              alt={playlist.title}
              fill
              priority
              sizes="260px"
              className="object-cover"
            />
          </div>

          <div className="relative flex min-w-0 flex-col justify-end">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-vivid-blue/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-vivid-blue">
                <Sparkles className="h-3 w-3" />
                Keval team curated
              </span>
              <span className="rounded-full bg-dandelion/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-vampire-black">
                {playlist.tag}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {playlist.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted/75 md:text-base">
              {playlist.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => leadTrack && handlePlayTrack(leadTrack)}
                disabled={!leadTrack}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasActiveTrack ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {hasActiveTrack ? "Pause Playlist" : "Preview Playlist"}
              </button>
              <Link
                href="/explore"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white/[0.06] px-5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                Explore Tags
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <h2 className="text-sm font-bold text-white">{playlist.title} Songs</h2>
          <p className="mt-1 text-xs text-muted">
            Related songs surfaced from the same Explore tag logic.
          </p>
        </div>

        <div className="hidden grid-cols-[56px_1fr_190px_72px_56px_120px] gap-4 border-b border-white/[0.04] px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-muted/30 lg:grid">
          <div aria-hidden />
          <div>Song</div>
          <div>Waveform</div>
          <div>Duration</div>
          <div className="text-center">Loved</div>
          <div className="text-right">Add to Cart</div>
        </div>

        {tracks.length ? (
          <div className="divide-y divide-white/[0.04]">
            {tracks.map((track) => (
              <PlaylistTrackRow
                key={track.id}
                track={track}
                isPlaying={isItemPlaying(track.id, "track")}
                isSaved={isInWishlist(track.id, "track")}
                isInCart={isInCart(track.id, "track")}
                onPlay={handlePlayTrack}
                onOpen={() => openSong(track, null)}
                onAddToCart={handleAddToCart}
                onToggleSave={() => toggleTrackWishlist(track)}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-muted">
            This playlist does not have synced songs yet.
          </div>
        )}
      </section>
    </div>
  );
}

function PlaylistTrackRow({
  track,
  isPlaying,
  isSaved,
  isInCart,
  onPlay,
  onOpen,
  onAddToCart,
  onToggleSave,
}: {
  track: Track;
  isPlaying: boolean;
  isSaved: boolean;
  isInCart: boolean;
  onPlay: (track: Track) => void;
  onOpen: () => void;
  onAddToCart: (track: Track) => void;
  onToggleSave: () => void;
}) {
  return (
    <div
      className="group transition-colors hover:bg-white/[0.03]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "80px" }}
    >
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[56px_1fr_190px_72px_56px_120px] lg:items-center">
        <div className="flex items-center gap-3 lg:block">
          <button
            type="button"
            onClick={() => onPlay(track)}
            aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className="group/cover relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]"
          >
            <Image
              src={track.coverUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
            <div
              className={cn(
                "absolute inset-0 z-10 flex items-center justify-center bg-black/45 transition-opacity duration-200",
                isPlaying
                  ? "opacity-100"
                  : "opacity-0 group-hover/cover:opacity-100 [@media(hover:none)]:opacity-100"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-vampire-black text-vampire-black" />
                ) : (
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-vampire-black text-vampire-black" />
                )}
              </span>
            </div>
          </button>

          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left lg:hidden">
            <p className="truncate text-sm font-semibold text-white hover:underline">
              {track.title}
            </p>
            <p className="truncate text-xs text-muted">{track.artist}</p>
            <TrackTagLine track={track} className="mt-0.5 text-[10px] text-muted/45" />
          </button>
        </div>

        <button type="button" onClick={onOpen} className="hidden min-w-0 text-left lg:block">
          <p className="truncate text-sm font-semibold text-white hover:underline">
            {track.title}
          </p>
          <p className="truncate text-xs text-muted">
            {track.artist} - {track.genre}
          </p>
          <TrackTagLine track={track} className="mt-0.5 text-[10px] text-muted/45" />
        </button>

        <div className="lg:block">
          <WaveformVisualizer
            data={resampleWaveform(track.waveform, 30)}
            isPlaying={isPlaying}
            progress={0}
            height={18}
            gap={1}
            stretch
          />
        </div>

        <span className="text-xs text-muted/70 lg:text-center">
          {formatDuration(track.duration)}
        </span>

        <div className="flex items-center lg:justify-center">
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={isSaved ? "Remove from Liked Songs" : "Add to Liked Songs"}
            aria-pressed={isSaved}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              isSaved
                ? "bg-zesty-red/15 text-zesty-red"
                : "bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
          </button>
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          <button
            type="button"
            onClick={() => onAddToCart(track)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all",
              isInCart
                ? "bg-vivid-blue text-white"
                : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isInCart ? "In Cart" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
