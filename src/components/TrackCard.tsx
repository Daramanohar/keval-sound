"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Heart, Pause, Play, ShoppingCart, Zap } from "lucide-react";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";
import WaveformVisualizer from "./WaveformVisualizer";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

interface TrackCardProps {
  track: Track;
  index?: number;
  rank?: number;
}

const TrackCard = memo(function TrackCard({ track, index = 0, rank }: TrackCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const { toggleTrack, isItemPlaying } = usePlayerControls();
  const {
    addTrackToCart,
    isInCart,
    isInWishlist,
    isOwned,
    toggleTrackWishlist,
  } = useStore();
  const { showToast } = useToast();

  const isPlaying = isItemPlaying(track.id, "track");
  const isFavorited = isInWishlist(track.id, "track");
  const inCart = isInCart(track.id, "track");
  const owned = isOwned(track.id, "track");

  const handlePreview = useCallback(() => {
    toggleTrack(track);
  }, [toggleTrack, track]);

  const handleAddToCart = useCallback(() => {
    if (owned) {
      showToast({
        tone: "info",
        title: `${track.title} is already in your library`,
        description: "Open Purchases to review the ownership record and license.",
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
            description: `${track.genre} · ${track.bpm} BPM · ${formatPrice(track.price)}`,
          }
        : {
            tone: "info",
            title: `${track.title} is already in your cart`,
            description: "Single tracks and packs can be checked out together.",
          }
    );
  }, [addTrackToCart, owned, showToast, track]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="glass-card group overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-700", track.coverUrl, isHovered && "scale-105")} />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/80 via-black/25 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {rank && rank <= 10 ? (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-zesty-red to-grey-magenta px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-zesty-red/20">
              <Zap className="h-2.5 w-2.5" /> #{rank}
            </span>
          ) : track.isTrending ? (
            <span className="flex items-center gap-1 rounded-full bg-zesty-red/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Zap className="h-2.5 w-2.5" /> Trending
            </span>
          ) : null}
          {track.isSellingFast && (
            <span className="rounded-full bg-dandelion/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-vampire-black">
              Selling Fast
            </span>
          )}
          {owned && (
            <span className="rounded-full bg-vivid-blue/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Owned
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleTrackWishlist(track)}
          className={cn(
            "absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full transition-all",
            isFavorited
              ? "bg-zesty-red text-white"
              : "bg-black/30 text-white/70 hover:bg-black/50 hover:text-white"
          )}
          aria-label="Toggle wishlist"
        >
          <Heart className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} />
        </button>

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            isHovered || isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handlePreview}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-vivid-blue/90 text-white shadow-lg shadow-vivid-blue/30 transition-all hover:scale-105 hover:bg-vivid-blue"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </motion.button>
        </div>

        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <WaveformVisualizer
              data={track.waveform}
              isPlaying
              progress={0}
              height={18}
              gap={1}
              stretch
            />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{track.title}</h3>
            <p className="truncate text-[11px] text-muted">{track.artist}</p>
          </div>
          <span className="whitespace-nowrap text-sm font-bold text-vivid-blue">
            {owned ? "Owned" : formatPrice(track.price)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(track.duration)}
          </span>
          <span>·</span>
          <span>{track.bpm} BPM</span>
          <span>·</span>
          <span>{track.key}</span>
          <span className="ml-auto truncate">{track.genre}</span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handlePreview}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
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
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              owned
                ? "bg-white/[0.06] text-white/70"
                : inCart
                  ? "bg-vivid-blue text-white"
                  : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue hover:text-white"
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

export default TrackCard;
