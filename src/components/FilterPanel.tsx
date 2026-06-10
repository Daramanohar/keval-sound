"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterState {
  genre: string;
}

export const defaultFilters: FilterState = {
  genre: "All Genres",
};

interface FilterPanelProps {
  value: FilterState;
  onFilterChange: (filters: FilterState) => void;
  genreOptions?: {
    name: string;
    count?: number;
    category?: string;
  }[];
  className?: string;
}

export default function FilterPanel({
  value,
  onFilterChange,
  genreOptions = [],
  className,
}: FilterPanelProps) {
  const resetFilters = () => onFilterChange(defaultFilters);
  const hasActiveFilters = value.genre !== defaultFilters.genre;
  const options = [
    {
      name: "All Genres",
      count: genreOptions.reduce((total, option) => total + (option.count ?? 0), 0),
      category: "All",
    },
    ...genreOptions,
  ];

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

      <div className="max-h-[calc(100vh-12rem)] space-y-1.5 overflow-y-auto pr-1">
        {options.map((option) => (
          <button
            key={option.name}
            type="button"
            onClick={() => onFilterChange({ genre: option.name })}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-all",
              value.genre === option.name
                ? "bg-vivid-blue text-white"
                : "bg-white/[0.04] text-muted hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {option.name === "All Genres" ? "All" : option.name}
              </span>
              {option.category && option.name !== "All Genres" && (
                <span className="mt-0.5 block truncate text-[10px] opacity-55">
                  {option.category}
                </span>
              )}
            </span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  value.genre === option.name ? "bg-white/20 text-white" : "bg-white/[0.06] text-muted"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
