"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Headphones, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
  image: string;
  badge: string;
  /** Glassy pill classes for the tag — blends with artwork, text stays white & legible */
  tagClass: string;
  /** Sparkle icon tint */
  iconClass: string;
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
    secondaryCta: "Keval Player",
    secondaryHref: "/player",
    image: "/banners/keval.png",
    tagClass: "bg-dandelion/15 ring-1 ring-dandelion/45 shadow-[0_6px_24px_rgba(255,235,153,0.18)]",
    iconClass: "text-dandelion",
  },
  {
    id: "commercial",
    badge: "Soundtrack your brand",
    title: "Commercial",
    subtitle:
      "From Radio-ready Pop and Soulful R&B to hard-hitting Rock and Metal, this collection delivers music for every commercial moment.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Commercial",
    image: "/banners/commercial.png",
    tagClass: "bg-vivid-blue/20 ring-1 ring-vivid-blue/50 shadow-[0_6px_24px_rgba(79,137,255,0.22)]",
    iconClass: "text-vivid-blue",
  },
  {
    id: "bollywood",
    badge: "Cinema in Sound",
    title: "Bollywood",
    subtitle:
      "Featuring Bollywood Fusion, Electronic, Epic, Romance, Rock, and Hip-hop sounds that blend cinematic emotion with contemporary energy.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Bollywood",
    image: "/banners/bollywood.png",
    tagClass: "bg-grey-magenta/25 ring-1 ring-grey-magenta/55 shadow-[0_6px_24px_rgba(107,20,84,0.3)]",
    iconClass: "text-[#ff8ad4]",
  },
  {
    id: "electronic",
    badge: "The sound of tomorrow, available today",
    title: "Electronic",
    subtitle:
      "From atmospheric Ambient textures and Lo-Fi grooves to high-energy EDM, Techno, Dubstep, Drum&Bass, Trance, and House rhythms, this collection delivers limitless electronic inspiration.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Electronic",
    image: "/banners/electronic.png",
    tagClass: "bg-grey-azure/25 ring-1 ring-grey-azure/55 shadow-[0_6px_24px_rgba(74,126,144,0.3)]",
    iconClass: "text-[#7fd4e8]",
  },
  {
    id: "culture",
    badge: "Global sounds. Local soul.",
    title: "Culture",
    subtitle:
      "Journey through Korean, Latin, Middle Eastern, Japanese, Chinese, Polish, Brazilian, Country, and Reggae sounds crafted to celebrate the world\u2019s musical heritage.",
    cta: "Preview Collection",
    ctaHref: "/packs?category=Culture",
    image: "/banners/culture.png",
    tagClass: "bg-mud-brown/30 ring-1 ring-dandelion/40 shadow-[0_6px_24px_rgba(255,235,153,0.16)]",
    iconClass: "text-dandelion",
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

  const textVariants = {
    enter: (incomingDirection: number) => ({
      x: incomingDirection > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (incomingDirection: number) => ({
      x: incomingDirection > 0 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <div
      className="relative w-full h-[240px] lg:h-[260px] rounded-2xl overflow-hidden bg-vampire-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* All banner images stay mounted and crossfade — no refetch, no flash, no latency */}
      {slides.map((item, index) => (
        <motion.div
          key={item.id}
          initial={false}
          animate={{ opacity: index === current ? 1 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
          aria-hidden={index !== current}
        >
          <Image
            src={item.image}
            alt={item.title}
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 1024px"
            quality={82}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-vampire-black/90 via-vampire-black/45 to-vampire-black/10" />
        </motion.div>
      ))}

      <div className="relative z-10 h-full w-full flex items-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={textVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full px-8 md:px-12 max-w-xl"
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[11px] font-semibold text-white backdrop-blur-md mb-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
                slide.tagClass
              )}
            >
              <Sparkles className={cn("w-3 h-3", slide.iconClass)} />
              {slide.badge}
            </span>

            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              {slide.title}
            </h2>

            <p className="mt-2 text-xs md:text-sm text-white/70 leading-relaxed max-w-md line-clamp-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
              {slide.subtitle}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link
                href={slide.ctaHref}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-vampire-black text-xs font-semibold hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-md"
              >
                {slide.cta}
              </Link>
              {slide.secondaryCta && slide.secondaryHref && (
                <Link
                  href={slide.secondaryHref}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold ring-1 ring-white/25 backdrop-blur-md hover:bg-white/20 transition-all hover:-translate-y-0.5"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  {slide.secondaryCta}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

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
  );
}
