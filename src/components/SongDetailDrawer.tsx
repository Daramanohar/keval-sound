"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  ExternalLink,
  Pause,
  Play,
  Plus,
  Share2,
  X,
} from "lucide-react";
import { useSongDetail } from "@/lib/song-detail-context";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { cn, formatDuration } from "@/lib/utils";
import type { Pack, Track } from "@/lib/mock-data";

const SONG_PRICE = 99;

/**
 * Suno-style right-side song detail drawer. Displays the song's cover,
 * metadata, lyrics, and quick actions. Mounted globally; opened via
 * `useSongDetail().openSong(track, pack)`.
 */
export default function SongDetailDrawer() {
  const { opened, isOpen, close } = useSongDetail();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {opened ? (
        <DrawerContent key={opened.track.id} track={opened.track} pack={opened.pack} onClose={close} />
      ) : null}
    </AnimatePresence>
  );
}

function DrawerContent({
  track,
  pack,
  onClose,
}: {
  track: Track;
  pack: Pack | null;
  onClose: () => void;
}) {
  const isImageCover = (pack?.coverUrl ?? track.coverUrl).startsWith("/");
  const coverUrl = pack?.coverUrl ?? track.coverUrl;

  const { addTrackToCart, isInCart, isOwned } = useStore();
  const { showToast } = useToast();
  const { toggleTrack, isItemPlaying, currentItem } = usePlayerControls();

  const trackPlaying = isItemPlaying(track.id, "track");
  const trackOwned = isOwned(track.id, "track");
  const trackInCart = isInCart(track.id, "track");
  const isCurrent = currentItem?.id === track.id;

  // Lyrics fetched lazily. Initial state covers the "no URL" case so we
  // never need a synchronous setState in the effect — only the async
  // success/failure handlers update state.
  // DrawerContent re-mounts per track (keyed in parent), so initial state
  // is correct for each open.
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsState, setLyricsState] = useState<"loading" | "missing" | "ready">(
    track.lyricsUrl ? "loading" : "missing"
  );

  useEffect(() => {
    if (!track.lyricsUrl) return;
    let cancelled = false;
    fetch(track.lyricsUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not-ok"))))
      .then((text) => {
        if (cancelled) return;
        setLyrics(text);
        setLyricsState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLyricsState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [track.lyricsUrl]);

  const handleAddToCart = () => {
    if (trackOwned) {
      showToast({ tone: "info", title: `${track.title} is already owned` });
      return;
    }
    const added = addTrackToCart(track);
    showToast(
      added
        ? { title: `${track.title} added to cart`, description: `${track.artist} · ₹${SONG_PRICE}` }
        : { tone: "info", title: `${track.title} is already in your cart` }
    );
  };

  const handleSaveToCrate = () => {
    showToast({ tone: "info", title: "Crates coming soon" });
  };

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/song/${track.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast({ tone: "info", title: "Track link copied" });
  };

  const handlePlayToggle = () => {
    if (pack) {
      toggleTrack(track, { queue: pack.tracks, pack });
    } else {
      toggleTrack(track);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${track.title}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md overflow-y-auto bg-[#0f1024] shadow-2xl shadow-black/60 scrollbar-hide"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0f1024]/90 px-4 py-3 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted/60">Song details</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-12 pt-5">
          {/* Cover with playing-state affordance */}
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-white/[0.04] shadow-2xl shadow-black/40">
            {isImageCover ? (
              <Image src={coverUrl} alt="" fill priority className="object-cover" sizes="280px" />
            ) : (
              <div className={cn("absolute inset-0 bg-gradient-to-br", coverUrl)} />
            )}
            <button
              type="button"
              onClick={handlePlayToggle}
              aria-label={trackPlaying ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/35"
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform",
                  trackPlaying || isCurrent ? "scale-100" : "scale-90 opacity-0 hover:opacity-100"
                )}
              >
                {trackPlaying ? (
                  <Pause className="h-6 w-6 fill-vampire-black text-vampire-black" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6 fill-vampire-black text-vampire-black" />
                )}
              </span>
            </button>
          </div>

          {/* Title block */}
          <div className="mt-5 text-center">
            <h2 className="text-2xl font-bold text-white">{track.title}</h2>
            <p className="mt-1 text-sm text-muted">{track.artist}</p>
            {pack ? (
              <Link
                href={`/pack/${pack.id}`}
                onClick={onClose}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-vivid-blue hover:text-accent-hover"
              >
                {pack.title}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>

          {/* Quick stats */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted/70">
            <span>{formatDuration(track.duration)}</span>
            <span className="h-1 w-1 rounded-full bg-muted/30" />
            <span>{track.bpm} BPM</span>
            <span className="h-1 w-1 rounded-full bg-muted/30" />
            <span>Key {track.key}</span>
          </div>

          {/* Actions */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={trackOwned}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-[11px] font-semibold transition-all",
                trackOwned
                  ? "cursor-not-allowed bg-white/[0.04] text-white/50"
                  : trackInCart
                    ? "bg-vivid-blue text-white"
                    : "bg-vivid-blue/15 text-vivid-blue hover:bg-vivid-blue/25"
              )}
            >
              <Plus className="h-4 w-4" />
              {trackOwned ? "Owned" : trackInCart ? "In Cart" : `Add ₹${SONG_PRICE}`}
            </button>
            <button
              type="button"
              onClick={handleSaveToCrate}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.05] px-3 py-3 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Bookmark className="h-4 w-4" />
              Save to Crate
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.05] px-3 py-3 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {/* Tags */}
          {track.tags.length > 0 ? (
            <div className="mt-6">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted/40">Tags</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {track.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80"
                  >
                    #{tag}
                  </span>
                ))}
                <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80">
                  {track.genre}
                </span>
                <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80">
                  {track.mood}
                </span>
              </div>
            </div>
          ) : null}

          {/* Lyrics */}
          <div className="mt-6">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted/40">Lyrics</p>
            <LyricsBlock state={lyricsState} text={lyrics} />
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function LyricsBlock({
  state,
  text,
}: {
  state: "loading" | "missing" | "ready";
  text: string | null;
}) {
  if (state === "loading") {
    return <p className="mt-2 text-sm text-muted/50">Loading lyrics…</p>;
  }
  if (state === "missing" || !text) {
    return <p className="mt-2 text-sm text-muted/50">Lyrics aren&apos;t available for this track yet.</p>;
  }
  return (
    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 font-body text-sm leading-relaxed text-white/85">
      {text}
    </pre>
  );
}
