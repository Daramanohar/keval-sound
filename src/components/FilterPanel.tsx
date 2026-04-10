"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { bpmRanges, genres, keys, moods, regions } from "@/lib/mock-data";

export interface FilterState {
  genre: string;
  mood: string;
  region: string;
  key: string;
  bpmRange: { label: string; min: number; max: number };
}

export const defaultFilters: FilterState = {
  genre: "All Genres",
  mood: "All Moods",
  region: "All Regions",
  key: "All Keys",
  bpmRange: bpmRanges[0],
};

interface FilterPanelProps {
  value: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

function FilterSection({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-white"
      >
        {title}
        <ChevronDown
          className={cn("w-4 h-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(option)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    value === option
                      ? "bg-vivid-blue text-white"
                      : "bg-white/[0.04] text-muted hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilterPanel({
  value,
  onFilterChange,
  className,
}: FilterPanelProps) {
  const updateFilter = (key: keyof FilterState, nextValue: string) => {
    onFilterChange({ ...value, [key]: nextValue });
  };

  const resetFilters = () => onFilterChange(defaultFilters);

  const hasActiveFilters =
    value.genre !== defaultFilters.genre ||
    value.mood !== defaultFilters.mood ||
    value.region !== defaultFilters.region ||
    value.key !== defaultFilters.key ||
    value.bpmRange.label !== defaultFilters.bpmRange.label;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Filters</h3>
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

      <FilterSection
        title="Genre"
        options={genres}
        value={value.genre}
        onChange={(nextValue) => updateFilter("genre", nextValue)}
      />
      <FilterSection
        title="Mood"
        options={moods}
        value={value.mood}
        onChange={(nextValue) => updateFilter("mood", nextValue)}
      />
      <FilterSection
        title="Region"
        options={regions}
        value={value.region}
        onChange={(nextValue) => updateFilter("region", nextValue)}
      />
      <FilterSection
        title="Key"
        options={keys}
        value={value.key}
        onChange={(nextValue) => updateFilter("key", nextValue)}
      />

      <div className="border-b border-border pb-4">
        <p className="py-2 text-sm font-medium text-white">BPM Range</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {bpmRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => onFilterChange({ ...value, bpmRange: range })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                value.bpmRange.label === range.label
                  ? "bg-vivid-blue text-white"
                  : "bg-white/[0.04] text-muted hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
