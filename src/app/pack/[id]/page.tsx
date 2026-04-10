"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Heart,
  Music,
  Pause,
  Play,
  Share2,
  ShoppingCart,
  Tag,
} from "lucide-react";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { packs, type Track } from "@/lib/mock-data";
import { cn, formatPrice, formatDuration, resampleWaveform } from "@/lib/utils";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

export default function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const {
    playPack,
    togglePlayback,
    toggleTrack,
    isItemPlaying,
    activePackId,
    isPlaying,
  } = usePlayerControls();
  const {
    addPackToCart,
    addTrackToCart,
    isInCart,
    isInWishlist,
    isOwned,
    togglePackWishlist,
    getLicense,
  } = useStore();
  const { showToast } = useToast();

  const pack = useMemo(() => packs.find((entry) => entry.id === params.id) ?? null, [params.id]);

  if (!pack) {
    notFound();
  }

  const discount = Math.round(((pack.originalPrice - pack.price) / pack.originalPrice) * 100);
  const inCart = isInCart(pack.id, "pack");
  const liked = isInWishlist(pack.id, "pack");
  const owned = isOwned(pack.id, "pack");
  const licenseCode = getLicense(pack.id, "pack");
  const isPreviewPlaying = activePackId === pack.id && isPlaying;

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : `/pack/${pack.id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({
        tone: "info",
        title: "Pack link copied",
        description: "Share the pack page with collaborators or clients.",
      });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handlePackAdd = useCallback(() => {
    if (owned) {
      showToast({
        tone: "info",
        title: `${pack.title} is already owned`,
        description: "Your ownership record and license are available in Purchases.",
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
            description: "You can still add individual songs from this pack if needed.",
          }
    );
  }, [addPackToCart, owned, pack, showToast]);

  const handleTrackAdd = useCallback(
    (track: Track) => {
      const trackOwned = isOwned(track.id, "track");
      if (trackOwned) {
        showToast({
          tone: "info",
          title: `${track.title} is already owned`,
          description: "This track is already part of your purchased catalog.",
        });
        return;
      }

      const added = addTrackToCart(track);

      showToast(
        added
          ? {
              title: `${track.title} added to cart`,
              description: `${track.artist} · ${track.genre} · ${formatPrice(track.price)}`,
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
    <div className="mx-auto max-w-6xl">
      <Link
        href="/packs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted/60 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Packs
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative mb-8 overflow-hidden rounded-3xl"
      >
        <div className={cn("h-72 bg-gradient-to-br md:h-[380px]", pack.coverUrl)} />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black via-vampire-black/60 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap gap-2">
                {pack.featured && (
                  <span className="rounded-full bg-dandelion/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-vampire-black">
                    Featured Pack
                  </span>
                )}
                {owned && (
                  <span className="rounded-full bg-vivid-blue/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Owned
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">{pack.title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
                {pack.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/55">
                <span className="flex items-center gap-1.5">
                  <Music className="h-4 w-4" />
                  {pack.trackCount} tracks
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.round(pack.totalDuration / 60)} min
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />
                  {pack.genre}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-left lg:text-right">
              <div className="mb-2 flex items-center gap-2 lg:justify-end">
                <span className="text-sm text-white/40 line-through">{formatPrice(pack.originalPrice)}</span>
                <span className="rounded-full bg-zesty-red/20 px-2 py-0.5 text-xs font-bold text-zesty-red">
                  -{discount}%
                </span>
              </div>
              <p className="text-3xl font-bold text-white">{formatPrice(pack.price)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePackAdd}
          className={cn(
            "flex items-center gap-2 rounded-xl px-8 py-3.5 font-semibold transition-all",
            owned
              ? "bg-white/[0.06] text-white/70"
              : inCart
                ? "bg-vivid-blue text-white"
                : "bg-gradient-to-r from-vivid-blue to-mid-purple text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {owned ? "Already Owned" : inCart ? "In Cart" : "Get Pack"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (activePackId === pack.id) {
              togglePlayback();
              return;
            }

            playPack(pack);
          }}
          className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-6 py-3.5 font-medium text-white transition-all hover:bg-white/[0.1]"
        >
          {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          Preview Pack
        </button>
        <button
          type="button"
          onClick={() => togglePackWishlist(pack)}
          className={cn(
            "rounded-xl p-3.5 transition-all",
            liked
              ? "bg-zesty-red/10 text-zesty-red"
              : "bg-white/[0.06] text-muted hover:bg-white/[0.1] hover:text-white"
          )}
          aria-label="Toggle wishlist"
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-xl bg-white/[0.06] p-3.5 text-muted transition-all hover:bg-white/[0.1] hover:text-white"
          aria-label="Copy pack link"
        >
          <Share2 className="h-4 w-4" />
        </button>
        {copied ? <span className="text-xs text-vivid-blue">Link copied</span> : null}
      </div>

      {owned && licenseCode && (
        <div className="mb-6 rounded-2xl border border-vivid-blue/20 bg-vivid-blue/8 p-4">
          <p className="text-sm font-semibold text-white">Ownership unlocked</p>
          <p className="mt-1 text-xs text-muted">
            Your license code for this pack is <span className="text-vivid-blue">{licenseCode}</span>.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-sm font-bold text-white">Songs in this pack ({pack.tracks.length})</h3>
          <p className="mt-1 text-xs text-muted">
            Preview the full pack or license individual songs one by one.
          </p>
        </div>

        <div className="hidden grid-cols-[48px_1fr_180px_88px_72px_100px_120px] gap-4 border-b border-white/[0.04] px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-muted/30 lg:grid">
          <div>Play</div>
          <div>Song</div>
          <div>Waveform</div>
          <div>Duration</div>
          <div>BPM</div>
          <div>Price</div>
          <div>License</div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {pack.tracks.map((track, index) => {
            const trackPlaying = isItemPlaying(track.id, "track");
            const trackOwned = isOwned(track.id, "track");
            const trackInCart = isInCart(track.id, "track");

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="group transition-colors hover:bg-white/[0.03]"
              >
                <div className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[48px_1fr_180px_88px_72px_100px_120px] lg:items-center">
                  <div className="flex items-center gap-3 lg:block">
                    <button
                      type="button"
                      onClick={() => toggleTrack(track, { queue: pack.tracks, pack })}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] transition-colors group-hover:bg-vivid-blue/20"
                    >
                      {trackPlaying ? (
                        <Pause className="h-4 w-4 text-vivid-blue" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4 text-muted" />
                      )}
                    </button>
                    <div className="lg:hidden">
                      <p className="text-sm font-semibold text-white">{track.title}</p>
                      <p className="text-xs text-muted">{track.artist}</p>
                    </div>
                  </div>

                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    <p className="truncate text-xs text-muted">
                      {track.artist} · {track.genre} · {track.key}
                    </p>
                  </div>

                  <div className="lg:block">
                    <WaveformVisualizer
                      data={resampleWaveform(track.waveform, 30)}
                      isPlaying={trackPlaying}
                      progress={0}
                      height={18}
                      gap={1}
                      stretch
                    />
                  </div>

                  <span className="text-xs text-muted/70 lg:text-center">
                    {formatDuration(track.duration)}
                  </span>
                  <span className="text-xs text-muted/70 lg:text-center">{track.bpm}</span>
                  <span className="text-sm font-semibold text-vivid-blue lg:text-center">
                    {trackOwned ? "Owned" : formatPrice(track.price)}
                  </span>

                  <div className="flex items-center justify-start lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleTrackAdd(track)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs font-semibold transition-all",
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
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {pack.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-muted/60"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
