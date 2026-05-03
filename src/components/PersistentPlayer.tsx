"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Info,
  ListMusic,
  MessageCircle,
  Music,
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  ThumbsDown,
  Volume2,
  X,
} from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";
import { cn, formatDuration, resampleWaveform } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { useSongDetail } from "@/lib/song-detail-context";
import { packs as allPacks, tracks as allTracks, type Pack, type Track } from "@/lib/mock-data";

/** Lookup the current playing item back to its source Track + Pack so the
 *  drawer + wishlist actions have full data — PlayableItem only carries id
 *  and stripped metadata. */
function findTrackContext(playableId: string | undefined): { track: Track | null; pack: Pack | null } {
  if (!playableId) return { track: null, pack: null };
  for (const pack of allPacks) {
    const track = pack.tracks.find((t) => t.id === playableId);
    if (track) return { track, pack };
  }
  const track = allTracks.find((t) => t.id === playableId) ?? null;
  return { track, pack: null };
}

export default function PersistentPlayer() {
  const { isAuthenticated } = useAuth();
  const {
    currentItem,
    isPlaying,
    isVisible,
    volume,
    isShuffle,
    repeatMode,
    togglePlayback,
    previousTrack,
    nextTrack,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
    dismissPlayer,
  } = usePlayerControls();
  const { currentTime, duration, progress, seekToProgress: seekToProgressFromProgress } = usePlayerProgress();
  const { isInWishlist, toggleTrackWishlist } = useStore();
  const { showToast } = useToast();
  const { openSong } = useSongDetail();

  // Look up the underlying Track/Pack for richer interactions (drawer, wishlist).
  // currentItem holds only stripped playable data, so we resolve it back.
  const { track: currentTrack, pack: currentPack } = findTrackContext(currentItem?.id);
  const currentTrackSaved = currentTrack ? isInWishlist(currentTrack.id, "track") : false;

  const waveformRef = useRef<HTMLDivElement>(null);
  const [waveformWidth, setWaveformWidth] = useState(0);

  useEffect(() => {
    const element = waveformRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setWaveformWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setWaveformWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [currentItem?.id]);

  const waveformData = (() => {
    if (!currentItem?.waveform?.length) return [];
    const targetBars = Math.max(56, Math.min(140, Math.floor(waveformWidth / 6)));
    return resampleWaveform(currentItem.waveform, targetBars || currentItem.waveform.length);
  })();

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextProgress = (event.clientX - bounds.left) / bounds.width;
    seekToProgressFromProgress(nextProgress);
  };

  if (!isAuthenticated || !currentItem || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 player-bar"
      >
        <div
          className="h-1 bg-white/[0.06] relative cursor-pointer group"
          onClick={handleSeek}
          aria-label="Seek playback"
        >
          <div
            className="h-full bg-gradient-to-r from-vivid-blue to-mid-purple transition-all"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-vivid-blue opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-3 min-w-0 lg:w-[280px]">
            {currentItem.coverUrl?.startsWith("/") ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                <Image
                  src={currentItem.coverUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentItem.coverUrl} flex items-center justify-center shrink-0`}>
                <Music className="w-4 h-4 text-white/60" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentItem.title}</p>
              <p className="text-xs text-muted truncate">
                {currentItem.artist}
                {currentItem.sourcePackTitle ? ` - ${currentItem.sourcePackTitle}` : ""}
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`text-muted hover:text-white transition-colors hidden sm:block ${isShuffle ? "text-vivid-blue" : ""}`}
                aria-label="Toggle shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={previousTrack}
                className="text-muted hover:text-white transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePlayback}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
                aria-label={isPlaying ? "Pause playback" : "Resume playback"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-vampire-black" />
                ) : (
                  <Play className="w-4 h-4 text-vampire-black ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="text-muted hover:text-white transition-colors"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeatMode}
                className={`text-muted hover:text-white transition-colors hidden sm:block ${repeatMode !== "off" ? "text-vivid-blue" : ""}`}
                aria-label="Cycle repeat mode"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted w-full">
              <span className="tabular-nums w-10 text-right">{formatDuration(Math.floor(currentTime))}</span>
              <div
                ref={waveformRef}
                className="flex-1 cursor-pointer"
                onClick={handleSeek}
                aria-label="Waveform timeline"
              >
                <WaveformVisualizer
                  data={waveformData}
                  isPlaying={isPlaying}
                  progress={progress}
                  height={22}
                  gap={2}
                  stretch
                  className="w-full"
                  activeColor="bg-gradient-to-t from-vivid-blue to-mid-purple"
                  inactiveColor="bg-white/10"
                />
              </div>
              <span className="tabular-nums w-10">{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 lg:w-[340px]">
            {/* Queue (placeholder) */}
            <PlayerIconButton
              label="Queue"
              onClick={() => showToast({ tone: "info", title: "Queue panel coming soon" })}
              className="hidden md:flex"
            >
              <ListMusic className="h-4 w-4" />
            </PlayerIconButton>

            {/* Save / Like (wishlist toggle) */}
            <PlayerIconButton
              label={currentTrackSaved ? "Saved" : "Save to wishlist"}
              onClick={() => {
                if (!currentTrack) {
                  showToast({ tone: "info", title: "Nothing to save" });
                  return;
                }
                toggleTrackWishlist(currentTrack);
                showToast({ tone: "info", title: currentTrackSaved ? "Removed from wishlist" : "Saved to wishlist" });
              }}
              active={currentTrackSaved}
              activeClassName="text-zesty-red"
            >
              <Heart className={cn("h-4 w-4", currentTrackSaved && "fill-current")} />
            </PlayerIconButton>

            {/* Dislike (placeholder) */}
            <PlayerIconButton
              label="Not for me"
              onClick={() => showToast({ tone: "info", title: "Recommendations feedback coming soon" })}
              className="hidden md:flex"
            >
              <ThumbsDown className="h-4 w-4" />
            </PlayerIconButton>

            {/* Comment (placeholder) */}
            <PlayerIconButton
              label="Comment"
              onClick={() => showToast({ tone: "info", title: "Comments coming soon" })}
              className="hidden lg:flex"
            >
              <MessageCircle className="h-4 w-4" />
            </PlayerIconButton>

            {/* Share (copies link to currently playing track) */}
            <PlayerIconButton
              label="Share"
              onClick={() => {
                if (typeof window === "undefined" || !currentTrack) return;
                const url = `${window.location.origin}/song/${currentTrack.id}`;
                if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
                showToast({ tone: "info", title: "Track link copied" });
              }}
            >
              <Share2 className="h-4 w-4" />
            </PlayerIconButton>

            {/* Volume (lg+ inline; smaller screens hide the slider) */}
            <div className="ml-1 hidden items-center gap-2 lg:flex">
              <Volume2 className="h-4 w-4 text-muted" />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(event) => setVolume(Number(event.target.value) / 100)}
                className="w-20 accent-vivid-blue"
                aria-label="Adjust volume"
              />
            </div>

            {/* Info — opens the song detail drawer for the active track */}
            <PlayerIconButton
              label="Show song details"
              onClick={() => {
                if (!currentTrack) {
                  showToast({ tone: "info", title: "No active track" });
                  return;
                }
                openSong(currentTrack, currentPack);
              }}
            >
              <Info className="h-4 w-4" />
            </PlayerIconButton>

            {/* Close player — preserved as a small dismiss affordance */}
            <PlayerIconButton label="Close player" onClick={dismissPlayer}>
              <X className="h-4 w-4" />
            </PlayerIconButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact icon button for the player bar's right cluster. Provides a
 * consistent 32×32 hit target with hover/active treatments so each
 * adornment (queue/save/share/info/close/etc.) lines up cleanly.
 */
function PlayerIconButton({
  label,
  onClick,
  children,
  active = false,
  activeClassName = "text-vivid-blue",
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  activeClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? cn(activeClassName, "bg-white/[0.05]")
          : "text-muted hover:bg-white/[0.06] hover:text-white",
        className
      )}
    >
      {children}
    </button>
  );
}
