"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, History, Search, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { optimizeSearchPrompt } from "@/lib/search-intent";

const suggestions = [
  "Upbeat Bollywood wedding track with dhol",
  "Lo-fi study beats with sitar melody",
  "Dark drill beat in a minor key",
  "Chill Tamil ambient with rain sounds",
  "Punjabi bhangra pop for dance video",
  "Emotional Bengali acoustic ballad",
];
const SEARCH_HISTORY_KEY = "keval-search-history";

interface SearchBarProps {
  size?: "hero" | "compact";
  className?: string;
  initialQuery?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
}

export default function SearchBar({
  size = "hero",
  className,
  initialQuery = "",
  onSearch,
  onClear,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [optimized, setOptimized] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  useEffect(() => {
    const savedSearches = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!savedSearches) return;

    try {
      const parsed = JSON.parse(savedSearches);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((item) => typeof item === "string").slice(0, 6));
      }
    } catch {
      window.localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
  }, []);

  const persistRecentSearches = (items: string[]) => {
    setRecentSearches(items);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  };

  const saveRecentSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    persistRecentSearches([
      trimmed,
      ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 6));
  };

  const removeRecentSearch = (value: string) => {
    persistRecentSearches(recentSearches.filter((item) => item !== value));
  };

  const runSearch = (value: string) => {
    const trimmed = value.trim();
    saveRecentSearch(trimmed);
    onSearch?.(trimmed);
    setFocused(false);
  };

  const handleOptimize = () => {
    if (!query.trim()) return;
    const optimizedQuery = optimizeSearchPrompt(query);

    setQuery(optimizedQuery);
    setOptimized(true);
    runSearch(optimizedQuery);
    window.setTimeout(() => setOptimized(false), 1800);
  };

  const handleSearch = () => {
    runSearch(query);
  };

  const isHero = size === "hero";
  const dropdownSuggestions = recentSearches.length > 0
    ? recentSearches
    : suggestions.slice(0, isHero ? 4 : 5);

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
              onClear?.();
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
        {focused && !query && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl search-dropdown"
          >
            <div className="p-3">
              <p className="px-3 py-2 text-xs text-light-grey/50 font-medium uppercase tracking-wider">
                {recentSearches.length > 0 ? "Recent searches" : "Try searching with natural language"}
              </p>
              {dropdownSuggestions.map((suggestion) => {
                const isRecent = recentSearches.includes(suggestion);

                return (
                  <div
                    key={suggestion}
                    className="group flex items-center gap-2 rounded-lg text-sm text-light-grey/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setQuery(suggestion);
                        runSearch(suggestion);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      {isRecent ? (
                        <History className="w-3.5 h-3.5 shrink-0 text-dandelion/70" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-vivid-blue" />
                      )}
                      <span className="truncate">{suggestion}</span>
                    </button>
                    {isRecent ? (
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          removeRecentSearch(suggestion);
                        }}
                        className="mr-2 rounded-md p-1.5 text-muted/50 opacity-0 transition-colors hover:text-zesty-red group-hover:opacity-100"
                        aria-label={`Remove ${suggestion} from recent searches`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
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
