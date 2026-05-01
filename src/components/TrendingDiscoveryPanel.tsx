"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowRight,
  Flame,
  Pause,
  Play,
  TrendingUp,
} from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";
import { packs } from "@/lib/mock-data";
import { resampleWaveform } from "@/lib/utils";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";

const featuredPack = packs.find((pack) => pack.featured) ?? packs[0];

export default function TrendingDiscoveryPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const { playPack, togglePlayback, activePackId, isPlaying } = usePlayerControls();
  const { progress } = usePlayerProgress();
  const { isOwned } = useStore();

  const rankedPacks = useMemo(
    () =>
      [...packs].sort((left, right) => {
        if (left.featured !== right.featured) {
          return left.featured ? -1 : 1;
        }
        return right.trackCount - left.trackCount;
      }),
    []
  );

  const isFeaturedActive = activePackId === featuredPack.id;
  const featuredWaveform = resampleWaveform(featuredPack.tracks[0]?.waveform ?? [], 72);
  const featuredOwned = isOwned(featuredPack.id, "pack");

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
    <div ref={panelRef}>
      <div
        data-discovery-item
        className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] group"
      >
        {/* Featured pack cover */}
        <div className="relative h-36 overflow-hidden">
          {featuredPack.coverUrl.startsWith("/") ? (
            <Image
              src={featuredPack.coverUrl}
              alt={featuredPack.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="320px"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${featuredPack.coverUrl} transition-transform duration-700 group-hover:scale-105`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dandelion/90 text-vampire-black text-[10px] font-bold uppercase tracking-wider">
            <Flame className="w-2.5 h-2.5" />
            Trending Pack
          </div>

          <button
            type="button"
            onClick={() => {
              if (isFeaturedActive) { togglePlayback(); return; }
              playPack(featuredPack);
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={isFeaturedActive && isPlaying ? "Pause pack preview" : "Preview pack"}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
            >
              {isFeaturedActive && isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </motion.div>
          </button>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-sm font-bold text-white leading-tight">{featuredPack.title}</p>
            <p className="text-[10px] text-white/55 mt-0.5">{featuredPack.category}</p>
            <div className="mt-2">
              <WaveformVisualizer
                data={featuredWaveform}
                isPlaying={isFeaturedActive && isPlaying}
                progress={isFeaturedActive ? progress : 0}
                height={18}
                gap={2}
                stretch
                activeColor="bg-white"
                inactiveColor="bg-white/25"
              />
            </div>
          </div>
        </div>

        {/* Featured pack actions — preview + open detail */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isFeaturedActive) { togglePlayback(); return; }
                playPack(featuredPack);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors"
            >
              {isFeaturedActive && isPlaying ? (
                <><Pause className="w-3 h-3" /> Pause</>
              ) : (
                <><Play className="w-3 h-3" /> Preview</>
              )}
            </button>
            <Link
              href={`/pack/${featuredPack.id}`}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                featuredOwned
                  ? "bg-white/[0.06] text-white/70"
                  : "bg-vivid-blue/20 hover:bg-vivid-blue/30 text-vivid-blue"
              }`}
            >
              {featuredOwned ? "Owned" : "Open Pack"}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Ranked packs list — same card, continues below */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-vivid-blue" />
            <span className="text-[11px] font-bold text-white">Top Packs</span>
          </div>
          <Link
            href="/packs"
            className="flex items-center gap-0.5 text-[10px] text-muted/50 hover:text-vivid-blue transition-colors"
          >
            All packs <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {rankedPacks.map((pack, index) => {
            const packPlaying = activePackId === pack.id && isPlaying;
            const packProgress = activePackId === pack.id ? progress : 0;
            const packWaveform = resampleWaveform(pack.tracks[0]?.waveform ?? [], 28);
            const owned = isOwned(pack.id, "pack");

            return (
              <motion.div
                key={pack.id}
                data-discovery-item
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group/row"
              >
                <span className="w-4 text-center text-[10px] font-bold tabular-nums shrink-0 text-vivid-blue">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (activePackId === pack.id) { togglePlayback(); return; }
                    playPack(pack);
                  }}
                  className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white/[0.05]"
                  aria-label={`Preview ${pack.title}`}
                >
                  {pack.coverUrl.startsWith("/") ? (
                    <Image
                      src={pack.coverUrl}
                      alt={pack.title}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${pack.coverUrl}`} />
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  {packPlaying ? (
                    <Pause className="relative z-10 w-3.5 h-3.5 text-white" />
                  ) : (
                    <Play className="relative z-10 w-3.5 h-3.5 text-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <Link href={`/pack/${pack.id}`} className="text-xs font-semibold text-white truncate block hover:text-vivid-blue transition-colors">
                    {pack.title}
                  </Link>
                  <p className="text-[10px] text-muted/50 truncate">{pack.category}</p>
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
                          height={10}
                          gap={1}
                          stretch
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href={`/pack/${pack.id}`}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors shrink-0 flex items-center gap-0.5 ${
                    owned
                      ? "bg-white/[0.06] text-white/70"
                      : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                  }`}
                >
                  {owned ? "Owned" : "Open"}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
