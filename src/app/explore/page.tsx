"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Grid3X3, LayoutList, SlidersHorizontal, X } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SearchBar from "@/components/SearchBar";
import FilterPanel, {
  defaultFilters,
  type FilterState,
} from "@/components/FilterPanel";
import TrackCard from "@/components/TrackCard";
import SectionHeader from "@/components/SectionHeader";
import { tracks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filteredTracks = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();

    return tracks.filter((track) => {
      if (filters.genre !== "All Genres" && track.genre !== filters.genre) return false;

      if (!search) return true;

      const haystack = [
        track.title,
        track.artist,
        track.genre,
        track.mood,
        track.region,
        track.language,
        ...track.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [deferredQuery, filters]);

  const handleSearch = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.push(`/explore${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mid-purple/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 pt-12 pb-8">
          <SectionHeader
            title="Explore Catalog"
            subtitle={`${filteredTracks.length} exclusive tracks available${query ? ` for "${query}"` : ""}`}
            gradient
          />
          <div className="max-w-2xl">
            <SearchBar size="compact" initialQuery={query} onSearch={handleSearch} />
          </div>
        </div>
      </div>

      <div className="pb-16">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <FilterPanel value={filters} onFilterChange={setFilters} />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="text-sm text-muted">
                Showing <span className="text-white font-medium">{filteredTracks.length}</span> tracks
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
                <FilterPanel value={filters} onFilterChange={setFilters} />
              </motion.div>
            )}

            {filteredTracks.length > 0 ? (
              <div
                className={cn(
                  "grid gap-4 md:gap-6",
                  view === "grid"
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-2"
                )}
              >
                {filteredTracks.map((track, index) => (
                  <TrackCard key={track.id} track={track} index={index} />
                ))}
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
