"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  gradient: string;
  image?: string;
  badge?: string;
  accent: string;
}

const slides: Slide[] = [
  {
    id: "keval",
    badge: "Music without boundaries",
    title: "KEVAL MUSIC",
    subtitle:
      "The home of global sounds, cinematic scores, and modern hits. Built on exclusive music you won\u2019t find anywhere else.",
    cta: "Explore Catalog",
    ctaHref: "/packs",
    gradient: "from-mid-purple/40 via-grey-magenta/30 to-vampire-black",
    image: "/banners/keval.png",
    accent: "bg-mid-purple",
  },
  {
    id: "commercial",
    badge: "Soundtrack your brand",
    title: "Commercial",
    subtitle:
      "From Radio-ready Pop and Soulful R&B to hard-hitting Rock and Metal, this collection delivers music for every commercial moment.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Commercial",
    gradient: "from-vivid-blue/30 via-mid-purple/20 to-vampire-black",
    image: "/banners/commercial.png",
    accent: "bg-vivid-blue",
  },
  {
    id: "bollywood",
    badge: "Cinema in Sound",
    title: "Bollywood",
    subtitle:
      "Featuring Bollywood Fusion, Electronic, Epic, Romance, Rock, and Hip-hop sounds that blend cinematic emotion with contemporary energy.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Bollywood",
    gradient: "from-grey-magenta/35 via-zesty-red/20 to-vampire-black",
    image: "/banners/bollywood.png",
    accent: "bg-grey-magenta",
  },
  {
    id: "electronic",
    badge: "The sound of tomorrow, available today",
    title: "Electronic",
    subtitle:
      "From atmospheric Ambient textures and Lo-Fi grooves to high-energy EDM, Techno, Dubstep, Drum&Bass, Trance, and House rhythms, this collection delivers limitless electronic inspiration.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Electronic",
    gradient: "from-vivid-blue/25 via-grey-azure/15 to-vampire-black",
    image: "/banners/electronic.png",
    accent: "bg-vivid-blue",
  },
  {
    id: "culture",
    badge: "Global sounds. Local soul.",
    title: "Culture",
    subtitle:
      "Journey through Korean, Latin, Middle Eastern, Japanese, Chinese, Polish, Brazilian, Country, and Reggae sounds crafted to celebrate the world\u2019s musical heritage.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Culture",
    gradient: "from-zesty-red/25 via-grey-magenta/20 to-vampire-black",
    image: "/banners/culture.png",
    accent: "bg-zesty-red",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);

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
      className="relative w-full h-[240px] lg:h-[260px] rounded-2xl overflow-hidden"
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
            {slide.image && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              />
            )}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-r",
                slide.image
                  ? "from-vampire-black/90 via-vampire-black/45 to-vampire-black/10"
                  : slide.gradient
              )}
            />

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
              animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-8 right-[15%] w-14 h-14 rounded-full bg-white/[0.03] blur-sm"
            />
            <motion.div
              animate={{ y: [0, 8, 0], rotate: [0, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-8 right-[28%] w-20 h-20 rounded-full bg-white/[0.02] blur-sm"
            />

            <div className="h-full w-full flex items-center">
              <div className="relative z-10 w-full px-8 md:px-12 max-w-xl">
                {slide.badge && (
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                      "inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white mb-3",
                      slide.accent
                    )}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {slide.badge}
                  </motion.span>
                )}

                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight"
                >
                  {slide.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.4 }}
                  className="mt-2 text-xs md:text-sm text-white/60 leading-relaxed max-w-md line-clamp-2"
                >
                  {slide.subtitle}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="mt-4 flex items-center gap-2.5"
                >
                  <Link
                    href={slide.ctaHref}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-vampire-black text-xs font-semibold hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-md"
                  >
                    {slide.cta}
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
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
