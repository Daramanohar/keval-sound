"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Pause, Play, ShoppingCart, Tag } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import WaveformVisualizer from "./WaveformVisualizer";

interface MusicCardProps {
  track: Track;
  index?: number;
  variant?: "default" | "compact" | "wide";
}

const MusicCard = memo(function MusicCard({
  track,
  index = 0,
  variant = "default",
}: MusicCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const { toggleTrack, isItemActive, isItemPlaying } = usePlayerControls();
  const { currentTime, duration } = usePlayerProgress();
  const {
    addTrackToCart,
    isInCart,
    isInWishlist,
    isOwned,
    toggleTrackWishlist,
  } = useStore();
  const { showToast } = useToast();

  const isActive = isItemActive(track.id, "track");
  const isPlaying = isItemPlaying(track.id, "track");
  const progress = isActive && duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
  const liked = isInWishlist(track.id, "track");
  const inCart = isInCart(track.id, "track");
  const owned = isOwned(track.id, "track");

  const handlePreview = useCallback(() => {
    toggleTrack(track);
  }, [toggleTrack, track]);

  const handleAddToCart = useCallback(() => {
    if (owned) {
      showToast({
        tone: "info",
        title: `${track.title} is already owned`,
        description: "Open Purchases in your library to view the license and download details.",
      });
      return;
    }

    const added = addTrackToCart(track);

    setCartPulse(true);
    window.setTimeout(() => setCartPulse(false), 320);

    showToast(
      added
        ? {
            title: `${track.title} added to cart`,
            description: `${track.artist} · ${track.genre} · ${formatPrice(track.price)}`,
          }
        : {
            tone: "info",
            title: `${track.title} is already in your cart`,
            description: "You can mix single-track licenses and full packs in one checkout.",
          }
    );
  }, [addTrackToCart, owned, showToast, track]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.32 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300",
        "hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.06]",
        variant === "wide" ? "flex gap-4 p-4" : ""
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          variant === "wide" ? "h-20 w-20 shrink-0 rounded-xl" : "aspect-square rounded-t-2xl"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br transition-transform duration-700",
            track.coverUrl,
            isHovered && "scale-105"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/80 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {owned ? (
            <span className="rounded-full bg-dandelion px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-vampire-black">
              Owned
            </span>
          ) : (
            <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
              Single Track
            </span>
          )}
        </div>

        <div className="absolute right-2 top-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => toggleTrackWishlist(track)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
              liked
                ? "bg-zesty-red/85 text-white"
                : "bg-black/35 text-white/70 hover:bg-black/50 hover:text-white"
            )}
            aria-label="Toggle wishlist"
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
          </button>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-250",
            isHovered || isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handlePreview}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </motion.button>
        </div>

        {isActive ? (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <WaveformVisualizer
              data={track.waveform}
              isPlaying={isPlaying}
              progress={progress}
              height={16}
              gap={1}
              stretch
              className="w-full"
              activeColor="bg-white"
              inactiveColor="bg-white/25"
            />
          </div>
        ) : null}
      </div>

      <div className={cn("p-4", variant === "wide" && "flex-1 p-0 py-1")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-white">{track.title}</h4>
            <p className="mt-0.5 truncate text-xs text-muted">{track.artist}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-vivid-blue">
            {owned ? "Owned" : formatPrice(track.price)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted/80">
          <span>{track.genre}</span>
          <span className="text-muted/35">•</span>
          <span>{track.bpm} BPM</span>
          <span className="text-muted/35">•</span>
          <span>{track.key}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {track.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-muted"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handlePreview}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? "Pause" : "Preview"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            animate={cartPulse ? { scale: [1, 1.05, 1] } : undefined}
            onClick={handleAddToCart}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
              owned
                ? "bg-white/[0.06] text-white/70"
                : inCart
                  ? "bg-vivid-blue text-white"
                  : "bg-vivid-blue/12 text-vivid-blue hover:bg-vivid-blue hover:text-white"
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {owned ? "Owned" : inCart ? "In Cart" : "Add to Cart"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});

export default MusicCard;
