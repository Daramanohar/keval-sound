"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search, Sparkles, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const suggestions = [
  "Upbeat Bollywood wedding track with dhol",
  "Lo-fi study beats with sitar melody",
  "Dark drill beat 140 BPM in minor key",
  "Chill Tamil ambient with rain sounds",
  "Punjabi bhangra pop for dance video",
  "Emotional Bengali acoustic ballad",
];

const optimizations: Record<string, string> = {
  "sad song":
    "Melancholic Hindi ballad, slow tempo 70-85 BPM, minor key, acoustic guitar plus piano, emotional female vocals",
  "party music":
    "High-energy Bollywood dance track, 125-135 BPM, major key, dhol plus synth bass, festival vibes",
  "chill beats":
    "Lo-fi Indian fusion, 80-90 BPM, Am or Em key, sitar loops plus vinyl crackle and soft tabla, study or relaxation mood",
  workout:
    "Aggressive Desi hip-hop, 140 plus BPM, heavy 808 bass, trap hi-hats, motivational energy",
  wedding:
    "Festive Punjabi Bhangra, 110-120 BPM, dhol plus tumbi plus chimta, celebratory and joyful mood, Punjabi vocals",
};

interface SearchBarProps {
  size?: "hero" | "compact";
  className?: string;
  initialQuery?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({
  size = "hero",
  className,
  initialQuery = "",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [optimized, setOptimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % suggestions.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  const handleOptimize = () => {
    if (!query.trim()) return;
    const lower = query.toLowerCase().trim();
    const match = Object.keys(optimizations).find((key) => lower.includes(key));

    if (match) {
      setQuery(optimizations[match]);
    } else {
      setQuery(
        `${query} - enhanced: include BPM range, key signature, instrumentation, mood descriptor, and regional style`
      );
    }

    setOptimized(true);
    window.setTimeout(() => setOptimized(false), 1800);
  };

  const handleSearch = () => {
    onSearch?.(query.trim());
    setFocused(false);
  };

  const isHero = size === "hero";

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "relative flex items-center transition-all duration-300",
          isHero ? "glass rounded-2xl" : "glass-subtle rounded-xl",
          focused && "ring-1 ring-vivid-blue/50 shadow-lg shadow-vivid-blue/10"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 text-vivid-blue shrink-0",
            isHero ? "pl-5" : "pl-4"
          )}
        >
          <Sparkles className={cn(isHero ? "w-5 h-5" : "w-4 h-4")} />
          {isHero && <span className="text-xs font-medium hidden sm:inline">AI</span>}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOptimized(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder={suggestions[placeholderIndex]}
          className={cn(
            "flex-1 bg-transparent border-none outline-none text-white placeholder:text-light-grey/30",
            isHero ? "px-4 py-5 text-base" : "px-3 py-3 text-sm"
          )}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOptimized(false);
              inputRef.current?.focus();
            }}
            className="p-2 text-muted hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={handleOptimize}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 mr-1",
              optimized
                ? "bg-green-500/20 text-green-400"
                : "bg-dandelion/10 text-dandelion hover:bg-dandelion/20"
            )}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{optimized ? "Enhanced!" : "Optimize"}</span>
          </motion.button>
        )}

        <button
          type="button"
          onClick={handleSearch}
          className={cn(
            "flex items-center gap-2 font-medium text-white transition-all shrink-0",
            isHero
              ? "mr-3 px-6 py-3 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple hover:shadow-lg hover:shadow-vivid-blue/20"
              : "mr-2 px-4 py-2 rounded-lg bg-vivid-blue/20 hover:bg-vivid-blue/30 text-vivid-blue"
          )}
        >
          <Search className={cn(isHero ? "w-4 h-4" : "w-3.5 h-3.5")} />
          {isHero && <span className="text-sm hidden sm:inline">Search</span>}
        </button>
      </div>

      <AnimatePresence>
        {focused && !query && isHero && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 search-dropdown rounded-xl overflow-hidden z-20"
          >
            <div className="p-3">
              <p className="px-3 py-2 text-xs text-light-grey/50 font-medium uppercase tracking-wider">
                Try searching with natural language
              </p>
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={() => setQuery(suggestion)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-light-grey/70 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
                >
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-vivid-blue" />
                  {suggestion}
                </button>
              ))}
              <div className="mt-2 px-3 pt-2 border-t border-white/[0.06]">
                <p className="text-[10px] text-light-grey/30 flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3 text-dandelion/50" />
                  Type anything and click Optimize to sharpen your search prompt.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
