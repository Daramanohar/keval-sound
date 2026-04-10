"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowRight,
  Flame,
  Pause,
  Play,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";
import { packs, type Pack } from "@/lib/mock-data";
import { formatPrice, resampleWaveform } from "@/lib/utils";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

const featuredPack = packs.find((pack) => pack.featured) ?? packs[0];

export default function TrendingDiscoveryPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pulsePackId, setPulsePackId] = useState<string | null>(null);
  const { playPack, togglePlayback, activePackId, isPlaying } = usePlayerControls();
  const { progress } = usePlayerProgress();
  const { addPackToCart, isInCart, isOwned } = useStore();
  const { showToast } = useToast();

  const rankedPacks = useMemo(
    () =>
      [...packs]
        .sort((left, right) => {
          if (left.featured !== right.featured) {
            return left.featured ? -1 : 1;
          }

          return right.trackCount - left.trackCount;
        })
        .slice(0, 5),
    []
  );

  const isFeaturedActive = activePackId === featuredPack.id;
  const featuredWaveform = resampleWaveform(featuredPack.tracks[0]?.waveform ?? [], 72);
  const featuredInCart = isInCart(featuredPack.id, "pack");
  const featuredOwned = isOwned(featuredPack.id, "pack");

  const handlePackAdd = useCallback(
    (pack: Pack) => {
      const packOwned = isOwned(pack.id, "pack");

      if (packOwned) {
        showToast({
          tone: "info",
          title: `${pack.title} is already owned`,
          description: "Your pack license is available in Purchases and Downloads.",
        });
        return;
      }

      const added = addPackToCart(pack);
      setPulsePackId(pack.id);
      window.setTimeout(() => setPulsePackId((current) => (current === pack.id ? null : current)), 320);

      showToast(
        added
          ? {
              title: `${pack.title} added to cart`,
              description: `${pack.trackCount} tracks · ${formatPrice(pack.price)}`,
            }
          : {
              tone: "info",
              title: `${pack.title} is already in your cart`,
              description: "Complete checkout anytime from the cart.",
            }
      );
    },
    [addPackToCart, isOwned, showToast]
  );

  useGSAP(
    () => {
      if (!panelRef.current) return;

      gsap.fromTo(
        panelRef.current.querySelectorAll("[data-discovery-item]"),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    },
    { scope: panelRef }
  );

  return (
    <div ref={panelRef} className="flex flex-col gap-4 sticky top-20">
      <motion.div
        data-discovery-item
        whileHover={{ y: -4 }}
        className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] group"
      >
        <div className="relative h-52 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${featuredPack.coverUrl} transition-transform duration-700 group-hover:scale-105`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dandelion/90 text-vampire-black text-[10px] font-bold uppercase tracking-wider">
            <Flame className="w-2.5 h-2.5" />
            Trending Pack
          </div>

          <button
            type="button"
            onClick={() => {
              if (isFeaturedActive) {
                togglePlayback();
                return;
              }

              playPack(featuredPack);
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={isFeaturedActive && isPlaying ? "Pause pack preview" : "Preview pack"}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
            >
              {isFeaturedActive && isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </motion.div>
          </button>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-sm font-bold text-white leading-tight">{featuredPack.title}</p>
            <p className="text-[10px] text-white/55 mt-0.5">
              {featuredPack.trackCount} exclusive tracks
            </p>
            <div className="mt-3">
              <WaveformVisualizer
                data={featuredWaveform}
                isPlaying={isFeaturedActive && isPlaying}
                progress={isFeaturedActive ? progress : 0}
                height={22}
                gap={2}
                stretch
                activeColor="bg-white"
                inactiveColor="bg-white/25"
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{featuredPack.title}</h3>
              <p className="text-[10px] text-muted/60 mt-0.5 line-clamp-2 leading-relaxed">
                {featuredPack.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted/40 line-through">
                {formatPrice(featuredPack.originalPrice)}
              </p>
              <p className="text-base font-bold text-vivid-blue">{formatPrice(featuredPack.price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isFeaturedActive) {
                  togglePlayback();
                  return;
                }

                playPack(featuredPack);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors"
            >
              {isFeaturedActive && isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Preview
                </>
              )}
            </button>
            <motion.button
              type="button"
              onClick={() => handlePackAdd(featuredPack)}
              animate={pulsePackId === featuredPack.id ? { scale: [1, 1.05, 1] } : undefined}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                featuredOwned
                  ? "bg-white/[0.06] text-white/70"
                  : featuredInCart
                    ? "bg-vivid-blue text-white"
                    : "bg-vivid-blue/20 hover:bg-vivid-blue/30 text-vivid-blue"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {featuredOwned ? "Owned" : featuredInCart ? "In Cart" : "Get Pack"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        data-discovery-item
        className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06]"
      >
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-vivid-blue" />
            <h4 className="text-sm font-bold text-white">Discovery Panel</h4>
          </div>
          <Link
            href="/packs"
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-vivid-blue transition-colors"
          >
            Browse packs <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {rankedPacks.map((pack, index) => {
            const packPlaying = activePackId === pack.id && isPlaying;
            const packProgress = activePackId === pack.id ? progress : 0;
            const packWaveform = resampleWaveform(pack.tracks[0]?.waveform ?? [], 28);
            const inCart = isInCart(pack.id, "pack");
            const owned = isOwned(pack.id, "pack");

            return (
              <motion.div
                key={pack.id}
                data-discovery-item
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
              >
                <span className="w-5 text-center text-xs font-bold tabular-nums shrink-0 text-vivid-blue">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (activePackId === pack.id) {
                      togglePlayback();
                      return;
                    }

                    playPack(pack);
                  }}
                  className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br ${pack.coverUrl}`}
                  aria-label={`Preview ${pack.title}`}
                >
                  <div className="absolute inset-0 bg-black/35" />
                  {packPlaying ? (
                    <Pause className="relative z-10 w-4 h-4 text-white" />
                  ) : (
                    <Play className="relative z-10 w-4 h-4 text-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <Link href={`/pack/${pack.id}`} className="text-xs font-semibold text-white truncate block">
                    {pack.title}
                  </Link>
                  <p className="text-[10px] text-muted/50 truncate">
                    {pack.trackCount} tracks · {formatPrice(pack.price)}
                  </p>
                  <AnimatePresence>
                    {(packPlaying || packProgress > 0) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1"
                      >
                        <WaveformVisualizer
                          data={packWaveform}
                          isPlaying={packPlaying}
                          progress={packProgress}
                          height={12}
                          gap={1}
                          stretch
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  type="button"
                  onClick={() => handlePackAdd(pack)}
                  animate={pulsePackId === pack.id ? { scale: [1, 1.05, 1] } : undefined}
                  className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                    owned
                      ? "bg-white/[0.06] text-white/70"
                      : inCart
                        ? "bg-vivid-blue text-white"
                        : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                  }`}
                >
                  {owned ? "Owned" : inCart ? "In Cart" : "Get Pack"}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
