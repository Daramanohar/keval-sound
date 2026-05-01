"use client";

import { useState } from "react";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";
import PackCard from "@/components/PackCard";
import { packs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "All",        count: packs.length },
  { label: "Commercial", count: packs.filter((p) => p.category === "Commercial").length },
  { label: "Electronic", count: packs.filter((p) => p.category === "Electronic").length },
  { label: "Bollywood",  count: packs.filter((p) => p.category === "Bollywood").length },
  { label: "Indie",      count: packs.filter((p) => p.category === "Indie").length },
  { label: "Culture",    count: packs.filter((p) => p.category === "Culture").length },
  { label: "Occasion",   count: packs.filter((p) => p.category === "Occasion").length },
  { label: "Classic",    count: packs.filter((p) => p.category === "Classic").length },
];

export default function PacksPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPacks =
    activeCategory === "All"
      ? packs
      : packs.filter((p) => p.category === activeCategory);

  return (
    <PageTransition>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-grey-magenta/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl pt-10 pb-6">
          <SectionHeader
            title="Song Packs"
            subtitle="64 curated collections — 2,375 tracks total. One purchase, total exclusivity."
            gradient
          />

          {/* Category filter bar */}
          <div className="flex flex-wrap gap-2 mt-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  activeCategory === cat.label
                    ? "bg-vivid-blue text-white shadow-lg shadow-vivid-blue/20"
                    : "glass-subtle text-muted hover:text-white hover:bg-white/[0.08]"
                )}
              >
                {cat.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    activeCategory === cat.label
                      ? "bg-white/20 text-white"
                      : "bg-white/[0.08] text-muted/70"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packs Grid */}
      <div className="mx-auto max-w-7xl pb-16">
        {filteredPacks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredPacks.map((pack, i) => (
              <PackCard key={pack.id} pack={pack} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">No packs in this category</h3>
            <p className="text-sm text-muted">Check back soon — new packs are added weekly.</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-16 glass rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-mid-purple/10 via-transparent to-grey-magenta/10 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-3">How Packs Work</h3>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Each pack contains 25–50 carefully curated tracks. When you purchase a
              pack, every track inside becomes exclusively yours — they are permanently
              removed from the catalog. Save up to 40% compared to individual purchases.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              {[
                { value: "64", label: "Sound Packs" },
                { value: "2,375", label: "Total Songs" },
                { value: "100%", label: "Exclusive Ownership" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-xs text-muted mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
