"use client";

import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Heart,
  Pause,
  Play,
  Share2,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
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
  const { toggleTrack, isItemPlaying } = usePlayerControls();
  const { isInWishlist, isOwned, togglePackWishlist, addTrackToCart, isInCart } = useStore();
  const { showToast } = useToast();

  const owned = isOwned(pack.id, "pack");
  const liked = isInWishlist(pack.id, "pack");

  const goToDetail = useCallback(() => {
    router.push(`/pack/${pack.id}`);
  }, [router, pack.id]);

  const handleSave = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      togglePackWishlist(pack);
      showToast({
        tone: "info",
        title: liked ? `${pack.title} removed from wishlist` : `${pack.title} saved to wishlist`,
      });
    },
    [liked, pack, showToast, togglePackWishlist]
  );

  const handleShare = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/pack/${pack.id}`
          : `/pack/${pack.id}`;
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      try {
        if (typeof nav.share === "function") {
          await nav.share({ title: pack.title, url });
          return;
        }
      } catch {}
      try {
        await navigator.clipboard.writeText(url);
        showToast({ tone: "info", title: "Link copied", description: pack.title });
      } catch {}
    },
    [pack, showToast]
  );

  const handleTrackAdd = useCallback(
    (event: React.MouseEvent, track: Track) => {
      event.stopPropagation();
      const trackOwned = isOwned(track.id, "track");
      if (trackOwned) {
        showToast({
          tone: "info",
          title: `${track.title} is already owned`,
        });
        return;
      }
      const added = addTrackToCart(track);
      showToast(
        added
          ? { title: `${track.title} added to cart`, description: formatPrice(99) }
          : { tone: "info", title: `${track.title} is already in your cart` }
      );
    },
    [addTrackToCart, isOwned, showToast]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="glass-card flex flex-col overflow-hidden rounded-2xl"
    >
      {/* Album artwork — strict 1:1, full real estate, click → detail */}
      <button
        type="button"
        onClick={goToDetail}
        className="group relative aspect-square w-full overflow-hidden"
        aria-label={`Open ${pack.title}`}
      >
        {pack.coverUrl.startsWith("/") ? (
          <Image
            src={pack.coverUrl}
            alt={pack.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", pack.coverUrl)} />
        )}

        {/* Hover-only gradient + play affordance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vivid-blue/90 backdrop-blur-sm shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </span>
        </div>

        {/* Status badges (top-left) */}
        {(pack.featured || owned) && (
          <div className="absolute left-2 top-2 flex gap-1.5">
            {pack.featured && (
              <span className="rounded-full bg-dandelion/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-vampire-black">
                Featured
              </span>
            )}
            {owned && (
              <span className="rounded-full bg-vivid-blue/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Owned
              </span>
            )}
          </div>
        )}
      </button>

      {/* Title + category tag */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={goToDetail}
          className="block w-full text-left transition-colors hover:text-vivid-blue"
        >
          <h3 className="truncate text-sm font-bold text-white">{pack.title}</h3>
        </button>
        <span className="mt-0.5 inline-block rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted/70">
          {pack.category}
        </span>
      </div>

      {/* Action row — Preview / Save / Share / Expand */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-3">
        <button
          type="button"
          onClick={goToDetail}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-vivid-blue/10 px-3 py-2 text-xs font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/20"
        >
          <Play className="h-3 w-3 fill-current" />
          Preview
        </button>
        <button
          type="button"
          onClick={handleSave}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            liked
              ? "bg-zesty-red/15 text-zesty-red"
              : "bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share pack"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-muted transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((p) => !p);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide songs" : "Show songs"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            expanded
              ? "bg-vivid-blue/15 text-vivid-blue"
              : "bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white"
          )}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      </div>

      {/* Expandable song list — isolated per card */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="max-h-72 space-y-1 overflow-y-auto p-2">
              {pack.tracks.map((track, trackIndex) => {
                const trackPlaying = isItemPlaying(track.id, "track");
                const trackInCart = isInCart(track.id, "track");
                const trackOwned = isOwned(track.id, "track");

                return (
                  <div
                    key={track.id}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrack(track, { queue: pack.tracks, pack });
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-colors group-hover:bg-vivid-blue/20"
                      aria-label={trackPlaying ? "Pause" : "Play"}
                    >
                      {trackPlaying ? (
                        <Pause className="h-2.5 w-2.5 text-vivid-blue" />
                      ) : (
                        <Play className="ml-0.5 h-2.5 w-2.5 text-muted" />
                      )}
                    </button>
                    <span className="w-4 shrink-0 text-center text-[9px] text-muted/50">
                      {trackIndex + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">
                      {track.title}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleTrackAdd(e, track)}
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                        trackOwned
                          ? "text-white/50"
                          : trackInCart
                            ? "bg-vivid-blue text-white"
                            : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                      )}
                    >
                      {trackOwned ? "✓" : trackInCart ? "✓ In Cart" : "₹99"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default PackCard;
