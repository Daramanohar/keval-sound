"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Pause,
  Play,
  Search,
  ShoppingCart,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { samples, type Sample } from "@/lib/mock-data";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import { usePlayer } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";

type SortKey = "name" | "bpm" | "duration" | "price" | "instrument";
type SortDir = "asc" | "desc";
type SampleType = "all" | "loop" | "one-shot" | "stem" | "sfx";

export default function SamplesPage() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [typeFilter, setTypeFilter] = useState<SampleType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSamples = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const nextSamples = [...samples]
      .filter((sample) => (typeFilter === "all" ? true : sample.type === typeFilter))
      .filter((sample) => {
        if (!query) return true;

        return (
          sample.name.toLowerCase().includes(query) ||
          sample.instrument.toLowerCase().includes(query) ||
          sample.genre.toLowerCase().includes(query) ||
          sample.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      });

    nextSamples.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const direction = sortDir === "asc" ? 1 : -1;

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return leftValue.localeCompare(rightValue) * direction;
      }

      return ((leftValue as number) - (rightValue as number)) * direction;
    });

    return nextSamples;
  }, [searchQuery, sortDir, sortKey, typeFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  };

  const typeLabels: { value: SampleType; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "loop", label: "Loops" },
    { value: "one-shot", label: "One-Shots" },
    { value: "stem", label: "Stems" },
    { value: "sfx", label: "SFX" },
  ];

  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-grey-azure/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-8">
          <SectionHeader
            title="Samples & Loops"
            subtitle="Professional-grade Indian instrument samples, loops, and one-shots"
            gradient
          />

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search samples by name, instrument, genre..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-subtle bg-transparent text-sm text-white placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-vivid-blue/50 transition-all"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {typeLabels.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTypeFilter(type.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    typeFilter === type.value
                      ? "bg-vivid-blue text-white"
                      : "glass-subtle text-muted hover:text-white"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[40px_1fr_100px_80px_80px_100px_100px_80px_100px] gap-4 items-center px-6 py-3 border-b border-border">
            <div />
            <SortHeader label="Name" sortKeyName="name" active={sortKey === "name"} onSort={handleSort} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Type</span>
            <SortHeader label="BPM" sortKeyName="bpm" active={sortKey === "bpm"} onSort={handleSort} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Key</span>
            <SortHeader label="Duration" sortKeyName="duration" active={sortKey === "duration"} onSort={handleSort} />
            <SortHeader label="Instrument" sortKeyName="instrument" active={sortKey === "instrument"} onSort={handleSort} />
            <SortHeader label="Price" sortKeyName="price" active={sortKey === "price"} onSort={handleSort} />
            <div />
          </div>

          <div className="divide-y divide-border">
            {filteredSamples.map((sample, index) => (
              <SampleRow key={sample.id} sample={sample} index={index} />
            ))}
          </div>

          {filteredSamples.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted">No samples match your search.</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Showing {filteredSamples.length} of {samples.length} samples. All samples include instant licensing.
        </p>
      </div>
    </PageTransition>
  );
}

function SortHeader({
  label,
  sortKeyName,
  active,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  active: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKeyName)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted hover:text-white transition-colors",
        active && "text-vivid-blue"
      )}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );
}

function SampleRow({ sample, index }: { sample: Sample; index: number }) {
  const { toggleSample, isItemPlaying, getItemProgress } = usePlayer();
  const { addSampleToCart, isInCart, isOwned } = useStore();

  const isPlaying = isItemPlaying(sample.id, "sample");
  const progress = getItemProgress(sample.id, "sample");
  const inCart = isInCart(sample.id, "sample");
  const owned = isOwned(sample.id, "sample");

  const typeColors: Record<string, string> = {
    loop: "bg-vivid-blue/20 text-vivid-blue",
    "one-shot": "bg-dandelion/20 text-dandelion",
    stem: "bg-mid-purple/40 text-light-grey",
    sfx: "bg-zesty-red/20 text-zesty-red",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="group hover:bg-white/[0.03] transition-colors"
    >
      <div className="hidden md:grid grid-cols-[40px_1fr_100px_80px_80px_100px_100px_80px_100px] gap-4 items-center px-6 py-3">
        <button
          type="button"
          onClick={() => toggleSample(sample)}
          className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-vivid-blue/20 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-vivid-blue" />
          ) : (
            <Play className="w-3.5 h-3.5 text-muted ml-0.5" />
          )}
        </button>

        <div className="min-w-0">
          <p className="text-sm text-white truncate font-medium">{sample.name}</p>
          {(isPlaying || progress > 0) && (
            <WaveformVisualizer
              data={sample.waveform}
              isPlaying={isPlaying}
              progress={progress}
              height={16}
              gap={1}
              stretch
              className="mt-1"
            />
          )}
        </div>

        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit",
            typeColors[sample.type]
          )}
        >
          {sample.type}
        </span>

        <span className="text-sm text-muted tabular-nums">{sample.bpm || "-"}</span>
        <span className="text-sm text-muted">{sample.key}</span>
        <span className="text-sm text-muted tabular-nums">{formatDuration(sample.duration)}</span>
        <span className="text-sm text-muted truncate">{sample.instrument}</span>
        <span className="text-sm font-medium text-vivid-blue tabular-nums">
          {owned ? "Owned" : inCart ? "In cart" : formatPrice(sample.price)}
        </span>

        <button
          type="button"
          onClick={() => addSampleToCart(sample)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            owned
              ? "bg-white/[0.06] text-white/70 cursor-default"
              : inCart
                ? "bg-vivid-blue text-white"
                : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue hover:text-white"
          )}
        >
          <ShoppingCart className="w-3 h-3" />
          {owned ? "Owned" : inCart ? "Added" : "Add"}
        </button>
      </div>

      <div className="md:hidden flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSample(sample)}
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-vivid-blue" />
          ) : (
            <Play className="w-4 h-4 text-muted ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{sample.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={cn(
                "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                typeColors[sample.type]
              )}
            >
              {sample.type}
            </span>
            <span className="text-xs text-muted">
              {sample.bpm ? `${sample.bpm} BPM` : ""} {sample.key}
            </span>
            <span className="text-xs text-muted">{sample.instrument}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-vivid-blue">
            {owned ? "Owned" : inCart ? "In cart" : formatPrice(sample.price)}
          </p>
          <button
            type="button"
            onClick={() => addSampleToCart(sample)}
            className="text-[10px] text-muted hover:text-vivid-blue transition-colors mt-0.5"
          >
            {owned ? "Owned" : inCart ? "Added" : "+ Cart"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
