"use client";

import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Music,
  Pause,
  Play,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import type { Pack, Track } from "@/lib/mock-data";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

interface PackCardProps {
  pack: Pack;
  index?: number;
}

const PackCard = memo(function PackCard({ pack, index = 0 }: PackCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const { playPack, togglePlayback, activePackId, isPlaying, toggleTrack, isItemPlaying } =
    usePlayerControls();
  const { addPackToCart, addTrackToCart, isInCart, isOwned } = useStore();
  const { showToast } = useToast();

  const discount = Math.round(((pack.originalPrice - pack.price) / pack.originalPrice) * 100);
  const inCart = isInCart(pack.id, "pack");
  const owned = isOwned(pack.id, "pack");
  const isPreviewPlaying = activePackId === pack.id && isPlaying;

  const handlePackAdd = useCallback(() => {
    if (owned) {
      showToast({
        tone: "info",
        title: `${pack.title} is already owned`,
        description: "Open Purchases in your library to review the pack license.",
      });
      return;
    }

    const added = addPackToCart(pack);

    showToast(
      added
        ? {
            title: `${pack.title} added to cart`,
            description: `${pack.trackCount} tracks · ${formatPrice(pack.price)}`,
          }
        : {
            tone: "info",
            title: `${pack.title} is already in your cart`,
            description: "You can still add individual songs from inside the pack preview.",
          }
    );
  }, [addPackToCart, owned, pack, showToast]);

  const handleTrackAdd = useCallback(
    (track: Track) => {
      const alreadyOwned = isOwned(track.id, "track");
      if (alreadyOwned) {
        showToast({
          tone: "info",
          title: `${track.title} is already owned`,
          description: "This single track is already part of your purchased library.",
        });
        return;
      }

      const added = addTrackToCart(track);

      showToast(
        added
          ? {
              title: `${track.title} added to cart`,
              description: `${track.artist} · ${formatPrice(track.price)}`,
            }
          : {
              tone: "info",
              title: `${track.title} is already in your cart`,
              description: "Complete checkout anytime from the cart.",
            }
      );
    },
    [addTrackToCart, isOwned, showToast]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="glass-card overflow-hidden rounded-2xl"
    >
      <button type="button" onClick={() => router.push(`/pack/${pack.id}`)} className="block w-full text-left">
        <div className="relative">
          <div className={cn("h-48 bg-gradient-to-br", pack.coverUrl)} />
          <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/90 via-vampire-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-start justify-between">
              <div>
                {pack.featured && (
                  <span className="mb-2 inline-block rounded-full bg-dandelion/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-vampire-black">
                    Featured
                  </span>
                )}
                {owned && (
                  <span className="mb-2 ml-2 inline-block rounded-full bg-vivid-blue/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Owned
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{pack.title}</h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <Music className="h-3.5 w-3.5" />
                    {pack.trackCount} tracks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.round(pack.totalDuration / 60)} min
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted line-through">
                    {formatPrice(pack.originalPrice)}
                  </span>
                  <span className="rounded-full bg-zesty-red/20 px-2 py-0.5 text-xs font-bold text-zesty-red">
                    -{discount}%
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">{formatPrice(pack.price)}</p>
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="p-6">
        <p className="text-sm leading-relaxed text-muted">{pack.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pack.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-muted"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();

              if (activePackId === pack.id) {
                togglePlayback();
                return;
              }

              playPack(pack);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
          >
            {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Preview Pack
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handlePackAdd();
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              owned
                ? "bg-white/[0.06] text-white/70"
                : inCart
                  ? "bg-vivid-blue text-white"
                  : "bg-gradient-to-r from-vivid-blue to-mid-purple text-white hover:shadow-lg hover:shadow-vivid-blue/20"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {owned ? "Owned" : inCart ? "In Cart" : "Get Pack"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 flex items-center gap-2 text-sm text-vivid-blue transition-colors hover:text-accent-hover"
        >
          <span>{expanded ? "Hide tracks" : `Preview ${pack.tracks.length} songs`}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {pack.tracks.map((track, trackIndex) => {
                  const trackPlaying = isItemPlaying(track.id, "track");
                  const trackOwned = isOwned(track.id, "track");
                  const trackInCart = isInCart(track.id, "track");

                  return (
                    <div
                      key={track.id}
                      className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-white/[0.04]"
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleTrack(track, { queue: pack.tracks, pack });
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] transition-colors group-hover:bg-vivid-blue/20"
                      >
                        {trackPlaying ? (
                          <Pause className="h-3.5 w-3.5 text-vivid-blue" />
                        ) : (
                          <Play className="ml-0.5 h-3.5 w-3.5 text-muted" />
                        )}
                      </button>
                      <span className="w-5 text-xs text-muted">{trackIndex + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{track.title}</p>
                        <p className="truncate text-xs text-muted">
                          {track.artist} · {track.genre} · {track.bpm} BPM
                        </p>
                      </div>
                      <span className="hidden text-xs text-muted sm:block">
                        {formatDuration(track.duration)}
                      </span>
                      <span className="w-20 text-right text-xs font-semibold text-vivid-blue">
                        {trackOwned ? "Owned" : formatPrice(track.price)}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTrackAdd(track);
                        }}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors",
                          trackOwned
                            ? "bg-white/[0.06] text-white/70"
                            : trackInCart
                              ? "bg-vivid-blue text-white"
                              : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                        )}
                      >
                        {trackOwned ? "Owned" : trackInCart ? "In Cart" : "Add to Cart"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default PackCard;
