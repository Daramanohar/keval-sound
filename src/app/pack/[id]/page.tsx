"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  Pause,
  Play,
  Plus,
  Share2,
  ShoppingCart,
} from "lucide-react";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { packs, type Track } from "@/lib/mock-data";
import { cn, formatDuration, resampleWaveform } from "@/lib/utils";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

const SONG_PRICE = 99;

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
    addTrackToCart,
    isInCart,
    isInWishlist,
    isOwned,
    togglePackWishlist,
    toggleTrackWishlist,
    getLicense,
  } = useStore();
  const { showToast } = useToast();

  const pack = useMemo(() => packs.find((entry) => entry.id === params.id) ?? null, [params.id]);

  if (!pack) {
    notFound();
  }

  const liked = isInWishlist(pack.id, "pack");
  const owned = isOwned(pack.id, "pack");
  const licenseCode = getLicense(pack.id, "pack");
  const isPreviewPlaying = activePackId === pack.id && isPlaying;
  const isImageCover = pack.coverUrl.startsWith("/");

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : `/pack/${pack.id}`;
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ title: pack.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({ tone: "info", title: "Pack link copied" });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleTrackAdd = useCallback(
    (track: Track) => {
      const trackOwned = isOwned(track.id, "track");
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
    },
    [addTrackToCart, isOwned, showToast]
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Back link — compact, no extra top spacing */}
      <Link
        href="/packs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted/60 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Packs
      </Link>

      {/* Hero — side-by-side: real album art + title/actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex flex-col gap-6 md:flex-row md:items-end"
      >
        {/* Square cover */}
        <div className="relative aspect-square w-full max-w-[260px] shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/40 md:w-64">
          {isImageCover ? (
            <Image
              src={pack.coverUrl}
              alt={pack.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 260px"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", pack.coverUrl)} />
          )}
        </div>

        {/* Title + meta + actions */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            {pack.featured && (
              <span className="rounded-full bg-dandelion/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-vampire-black">
                Featured Pack
              </span>
            )}
            {owned && (
              <span className="rounded-full bg-vivid-blue/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Owned
              </span>
            )}
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {pack.category}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white md:text-4xl">{pack.title}</h1>

          {/* Action row — Preview, Save, Share (no Get Pack) */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activePackId === pack.id) {
                  togglePlayback();
                  return;
                }
                playPack(pack);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
            >
              {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              {isPreviewPlaying ? "Pause" : "Preview Pack"}
            </button>
            <button
              type="button"
              onClick={() => togglePackWishlist(pack)}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
              className={cn(
                "rounded-xl p-3 transition-all",
                liked
                  ? "bg-zesty-red/10 text-zesty-red"
                  : "bg-white/[0.06] text-muted hover:bg-white/[0.1] hover:text-white"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share pack"
              className="rounded-xl bg-white/[0.06] p-3 text-muted transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {copied ? <span className="text-xs text-vivid-blue">Link copied</span> : null}
          </div>
        </div>
      </motion.div>

      {owned && licenseCode && (
        <div className="mb-6 rounded-2xl border border-vivid-blue/20 bg-vivid-blue/8 p-4">
          <p className="text-sm font-semibold text-white">Ownership unlocked</p>
          <p className="mt-1 text-xs text-muted">
            Your license code for this pack is <span className="text-vivid-blue">{licenseCode}</span>.
          </p>
        </div>
      )}

      {/* Songs table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-sm font-bold text-white">Songs</h3>
          <p className="mt-1 text-xs text-muted">
            License individual songs at ₹{SONG_PRICE} each. Preview the full pack with the button above.
          </p>
        </div>

        {/* Header — Play · Song · Waveform · Duration · Price · Loved · License This */}
        <div className="hidden grid-cols-[48px_1fr_180px_72px_56px_56px_120px] gap-4 border-b border-white/[0.04] px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-muted/30 lg:grid">
          <div className="whitespace-nowrap">Play</div>
          <div className="whitespace-nowrap">Song</div>
          <div className="whitespace-nowrap">Waveform</div>
          <div className="whitespace-nowrap">Duration</div>
          <div className="whitespace-nowrap text-center">Price</div>
          <div className="whitespace-nowrap text-center">Loved</div>
          <div className="whitespace-nowrap text-right">License This</div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {pack.tracks.map((track, index) => {
            const trackPlaying = isItemPlaying(track.id, "track");
            const trackOwned = isOwned(track.id, "track");
            const trackInCart = isInCart(track.id, "track");
            const trackSaved = isInWishlist(track.id, "track");

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(index * 0.02, 0.4) }}
                className="group transition-colors hover:bg-white/[0.03]"
              >
                <div className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[48px_1fr_180px_72px_56px_56px_120px] lg:items-center">
                  {/* Play */}
                  <div className="flex items-center gap-3 lg:block">
                    <button
                      type="button"
                      onClick={() => toggleTrack(track, { queue: pack.tracks, pack })}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] transition-colors group-hover:bg-vivid-blue/20"
                      aria-label={trackPlaying ? "Pause" : "Play"}
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

                  {/* Song (lg+) */}
                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    <p className="truncate text-xs text-muted">
                      {track.artist} · {track.genre}
                    </p>
                  </div>

                  {/* Waveform */}
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

                  {/* Duration */}
                  <span className="text-xs text-muted/70 lg:text-center">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Price — uniform ₹99 */}
                  <span className="text-sm font-semibold text-vivid-blue lg:text-center">
                    {trackOwned ? "Owned" : `₹${SONG_PRICE}`}
                  </span>

                  {/* Loved — per-row wishlist toggle (Heart) */}
                  <div className="flex items-center lg:justify-center">
                    <button
                      type="button"
                      onClick={() => toggleTrackWishlist(track)}
                      aria-label={trackSaved ? "Remove from wishlist" : "Add to wishlist"}
                      aria-pressed={trackSaved}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        trackSaved
                          ? "bg-zesty-red/15 text-zesty-red"
                          : "bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white"
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5", trackSaved && "fill-current")} />
                    </button>
                  </div>

                  {/* License This — adds the song to cart at ₹99 */}
                  <div className="flex items-center justify-start lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleTrackAdd(track)}
                      disabled={trackOwned}
                      className={cn(
                        "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                        trackOwned
                          ? "cursor-not-allowed bg-white/[0.06] text-white/60"
                          : trackInCart
                            ? "bg-vivid-blue text-white"
                            : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                      )}
                    >
                      {trackOwned ? (
                        "Owned"
                      ) : trackInCart ? (
                        <>
                          <ShoppingCart className="h-3 w-3" /> In Cart
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> License This
                        </>
                      )}
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
