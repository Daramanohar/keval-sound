"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Grid3X3, LayoutList, Loader2, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SearchBar from "@/components/SearchBar";
import FilterPanel, {
  defaultFilters,
  type FilterState,
} from "@/components/FilterPanel";
import TrackCard from "@/components/TrackCard";
import SectionHeader from "@/components/SectionHeader";
import type { Track } from "@/lib/mock-data";
import type { ExploreGenreOption } from "@/lib/explore-search";
import { cn } from "@/lib/utils";

type ExploreSearchPayload = {
  query: string;
  originalQuery?: string;
  optimizedQuery?: string;
  acknowledgement?: string;
  searchMode?: "metadata" | "vector";
  vectorReady?: boolean;
  genre: string;
  total: number;
  limit: number;
  tracks: Track[];
  genres: ExploreGenreOption[];
};

type SearchPayloadState = ExploreSearchPayload & {
  requestKey: string;
};

type SearchErrorState = {
  requestKey: string;
  message: string;
};

function normalizeGenre(genre: string) {
  return genre === "All" || genre === defaultFilters.genre
    ? defaultFilters.genre
    : genre;
}

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const cleanQuery = query.trim();
  const activeGenre = normalizeGenre(filters.genre);
  const isDiscoveryView = !cleanQuery && activeGenre === defaultFilters.genre;
  const requestKey = useMemo(
    () => JSON.stringify({ query: cleanQuery, genre: activeGenre, resetVersion }),
    [activeGenre, cleanQuery, resetVersion]
  );
  const [payload, setPayload] = useState<SearchPayloadState | null>(null);
  const [errorState, setErrorState] = useState<SearchErrorState | null>(null);
  const isLoading = payload?.requestKey !== requestKey && errorState?.requestKey !== requestKey;
  const error = errorState?.requestKey === requestKey ? errorState.message : null;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (cleanQuery) params.set("q", cleanQuery);
    if (activeGenre !== defaultFilters.genre) params.set("genre", activeGenre);
    params.set("limit", "160");

    fetch(`/api/explore/search?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? "search_failed");
        }

        setPayload({ ...(data as ExploreSearchPayload), requestKey });
      })
      .catch((searchError) => {
        if (searchError.name === "AbortError") return;
        setErrorState({
          requestKey,
          message: searchError.message,
        });
    });

    return () => controller.abort();
  }, [activeGenre, cleanQuery, requestKey]);

  const filteredTracks = payload?.tracks ?? [];
  const totalMatches = payload?.total ?? 0;
  const visibleLimit = payload?.limit ?? 160;

  const handleSearch = (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      handleResetDiscovery();
      return;
    }

    const params = new URLSearchParams();
    params.set("q", trimmedQuery);
    setFilters(defaultFilters);
    setPayload(null);
    setErrorState(null);
    setShowMobileFilters(false);

    startTransition(() => {
      router.push(`/explore${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const handleResetDiscovery = () => {
    setFilters(defaultFilters);
    setPayload(null);
    setErrorState(null);
    setShowMobileFilters(false);
    setResetVersion((current) => current + 1);

    if (window.location.pathname === "/explore") {
      window.history.replaceState(null, "", "/explore");
    }

    startTransition(() => {
      router.replace("/explore", { scroll: false });
    });
  };

  const handleFilterChange = (nextFilters: FilterState) => {
    const nextGenre = normalizeGenre(nextFilters.genre);

    if (nextGenre === defaultFilters.genre) {
      handleResetDiscovery();
      return;
    }

    setFilters({ genre: nextGenre });
  };

  const searchSummary = useMemo(() => {
    if (isLoading && !payload) return "Searching the Keval metadata library";
    const searchLabel = payload?.searchMode === "vector" ? "AI matches" : "metadata matches";
    if (cleanQuery && activeGenre !== defaultFilters.genre) {
      return `${totalMatches} ${searchLabel} for "${cleanQuery}" inside ${activeGenre}`;
    }
    if (cleanQuery) return `${totalMatches} ${searchLabel} for "${cleanQuery}"`;
    if (activeGenre !== defaultFilters.genre) return `${totalMatches} ${activeGenre} tracks available`;
    return `${totalMatches} mixed tracks across the production catalog`;
  }, [activeGenre, cleanQuery, isLoading, payload, totalMatches]);

  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mid-purple/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 pt-12 pb-8">
          <SectionHeader
            title="Explore"
            subtitle={searchSummary}
            gradient
          />
          <div className="max-w-3xl">
            <SearchBar
              size="compact"
              initialQuery={query}
              onSearch={handleSearch}
              onClear={handleResetDiscovery}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-vivid-blue/10 px-2.5 py-1 text-vivid-blue">
                <BrainCircuit className="h-3.5 w-3.5" />
                {payload?.searchMode === "vector" ? "Vector AI search" : "Metadata-ranked search"}
              </span>
              <span>Try: cinematic trailer for a mountain scene</span>
              <span className="hidden sm:inline">or</span>
              <span>lo-fi study beat with soft piano</span>
              {!isDiscoveryView ? (
                <button
                  type="button"
                  onClick={handleResetDiscovery}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-white/75 transition-colors hover:border-vivid-blue/30 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset discovery
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-16">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <FilterPanel
                value={filters}
                onFilterChange={handleFilterChange}
                genreOptions={payload?.genres ?? []}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="text-sm text-muted">
                Showing <span className="text-white font-medium">{filteredTracks.length}</span>
                {totalMatches > visibleLimit ? (
                  <>
                    {" "}of <span className="text-white font-medium">{totalMatches}</span>
                  </>
                ) : null} tracks
                {!isDiscoveryView ? (
                  <button
                    type="button"
                    onClick={handleResetDiscovery}
                    className="ml-3 inline-flex items-center gap-1 text-vivid-blue transition-colors hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear search
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg glass-subtle text-sm text-muted hover:text-white transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </button>

                <div className="flex items-center rounded-lg glass-subtle overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      view === "grid"
                        ? "bg-vivid-blue/20 text-vivid-blue"
                        : "text-muted hover:text-white"
                    )}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn(
                      "p-2 transition-colors",
                      view === "list"
                        ? "bg-vivid-blue/20 text-vivid-blue"
                        : "text-muted hover:text-white"
                    )}
                    aria-label="List view"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {showMobileFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="lg:hidden mb-6 glass rounded-xl p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">Filters</span>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="p-1 text-muted hover:text-white"
                    aria-label="Close filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <FilterPanel
                  value={filters}
                  onFilterChange={handleFilterChange}
                  genreOptions={payload?.genres ?? []}
                />
              </motion.div>
            )}

            {isLoading && !payload ? (
              <div className="flex items-center justify-center py-24 text-muted">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-vivid-blue" />
                Searching the Keval AI music index...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-zesty-red/20 bg-zesty-red/10 p-6 text-sm text-zesty-red">
                Search failed: {error}
              </div>
            ) : filteredTracks.length > 0 ? (
              <div className="space-y-5">
                {payload?.acknowledgement ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-vivid-blue/15 bg-vivid-blue/[0.07] px-4 py-3 text-sm text-white/82"
                  >
                    <p>{payload.acknowledgement}</p>
                    {payload.optimizedQuery ? (
                      <p className="mt-1 text-xs text-muted">
                        Optimized search: <span className="text-vivid-blue">{payload.optimizedQuery}</span>
                      </p>
                    ) : null}
                  </motion.div>
                ) : null}

                <div
                  className={cn(
                    "grid gap-4 md:gap-6",
                    view === "grid"
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-1 sm:grid-cols-2"
                  )}
                >
                  {filteredTracks.map((track, index) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      index={index}
                      rank={query ? index + 1 : undefined}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Grid3X3 className="w-7 h-7 text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No tracks found</h3>
                <p className="text-sm text-muted">
                  Try a broader search or reset the filters to discover more tracks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
