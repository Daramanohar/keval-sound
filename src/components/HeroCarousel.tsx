"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { packs } from "@/lib/mock-data";
import { usePlayerControls } from "@/lib/player-context";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  previewPackId?: string;
  gradient: string;
  badge?: string;
  accent: string;
}

const slides: Slide[] = [
  {
    id: "s1",
    title: "Bollywood Essentials Vol. 1",
    subtitle:
      "25 premium cinematic tracks spanning romance, drama, and dance. The definitive Bollywood collection.",
    cta: "Explore Pack",
    ctaHref: "/pack/p1",
    previewPackId: "p1",
    gradient: "from-mid-purple/40 via-grey-magenta/30 to-vampire-black",
    badge: "New Release",
    accent: "bg-mid-purple",
  },
  {
    id: "s2",
    title: "Desi Hip Hop Starter Kit",
    subtitle:
      "28 hard-hitting beats from Delhi gully rap to Mumbai underground. Built for the streets.",
    cta: "Get Exclusive Access",
    ctaHref: "/pack/p4",
    previewPackId: "p4",
    gradient: "from-vivid-blue/30 via-mid-purple/20 to-vampire-black",
    badge: "Trending",
    accent: "bg-vivid-blue",
  },
  {
    id: "s3",
    title: "South Indian Beats Collection",
    subtitle:
      "30 tracks from Tamil, Telugu, Kannada, and Malayalam - classical Carnatic fusions to modern pop.",
    cta: "Preview Collection",
    ctaHref: "/pack/p2",
    previewPackId: "p2",
    gradient: "from-grey-magenta/35 via-zesty-red/20 to-vampire-black",
    badge: "Featured",
    accent: "bg-grey-magenta",
  },
  {
    id: "s4",
    title: "AI-Curated: Your Perfect Sound",
    subtitle:
      "Describe your vibe in natural language, jump into the catalog, and preview the closest matches instantly.",
    cta: "Try AI Search",
    ctaHref: "/explore",
    gradient: "from-vivid-blue/25 via-grey-azure/15 to-vampire-black",
    badge: "AI Powered",
    accent: "bg-vivid-blue",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const { playPack, activePackId, togglePlayback } = usePlayerControls();

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((value) => (value + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((value) => (value - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;

    const interval = window.setInterval(next, 6000);
    return () => window.clearInterval(interval);
  }, [next, paused]);

  const slide = slides[current];

  const variants = {
    enter: (incomingDirection: number) => ({
      x: incomingDirection > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (incomingDirection: number) => ({
      x: incomingDirection > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div
      className="relative w-full h-[420px] lg:h-[480px] rounded-2xl overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-full flex items-center justify-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-r", slide.gradient)} />

            <div className="absolute inset-0 opacity-[0.03]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <motion.div
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-16 right-[15%] w-20 h-20 rounded-full bg-white/[0.03] blur-sm"
            />
            <motion.div
              animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-20 right-[30%] w-32 h-32 rounded-full bg-white/[0.02] blur-sm"
            />

            <div className="h-full w-full flex items-center justify-center">
              <div className="relative z-10 w-full px-10 md:px-16 max-w-2xl">
              {slide.badge && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[11px] font-semibold text-white mb-4",
                    slide.accent
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  {slide.badge}
                </motion.span>
              )}

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
              >
                {slide.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="mt-3 text-sm md:text-base text-white/60 leading-relaxed max-w-lg"
              >
                {slide.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-6 flex items-center gap-3"
              >
                <Link
                  href={slide.ctaHref}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-vampire-black text-sm font-semibold hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-lg"
                >
                  {slide.cta}
                </Link>
                {slide.previewPackId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const pack = packs.find((entry) => entry.id === slide.previewPackId);
                      if (!pack) return;
                      if (activePackId === pack.id) {
                        togglePlayback();
                        return;
                      }
                      playPack(pack);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.15] transition-all backdrop-blur-sm"
                  >
                    <Play className="w-4 h-4" />
                    Preview
                  </button>
                ) : null}
              </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setDirection(index > current ? 1 : -1);
                setCurrent(index);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === current ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {!paused && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06] z-20">
            <motion.div
              key={current}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 6, ease: "linear" }}
              className="h-full bg-gradient-to-r from-vivid-blue to-mid-purple"
            />
          </div>
        )}
      </div>
    </div>
  );
}
