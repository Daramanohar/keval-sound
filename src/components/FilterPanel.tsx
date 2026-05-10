"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { genres } from "@/lib/mock-data";

export interface FilterState {
  genre: string;
}

export const defaultFilters: FilterState = {
  genre: "All Genres",
};

interface FilterPanelProps {
  value: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export default function FilterPanel({
  value,
  onFilterChange,
  className,
}: FilterPanelProps) {
  const resetFilters = () => onFilterChange(defaultFilters);
  const hasActiveFilters = value.genre !== defaultFilters.genre;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Genre</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-vivid-blue hover:text-accent-hover transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {genres.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFilterChange({ genre: option })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              value.genre === option
                ? "bg-vivid-blue text-white"
                : "bg-white/[0.04] text-muted hover:bg-white/[0.08] hover:text-white"
            )}
          >
            {option === "All Genres" ? "All" : option}
          </button>
        ))}
      </div>
    </div>
  );
}
