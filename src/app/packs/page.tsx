"use client";

import { useState } from "react";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";
import PackCard from "@/components/PackCard";
import { packs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Commercial",
  "Electronic",
  "Bollywood",
  "Indie",
  "Culture",
  "Occasion",
  "Classic",
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
        <div className="relative z-10 pt-8 pb-6">
          <SectionHeader title="Song Packs" gradient />

          {/* Category filter bar */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  activeCategory === cat
                    ? "bg-vivid-blue text-white shadow-lg shadow-vivid-blue/20"
                    : "glass-subtle text-muted hover:text-white hover:bg-white/[0.08]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packs Grid — items-start prevents row-height stretching when one card expands */}
      <div className="pb-16">
        {filteredPacks.length > 0 ? (
          <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
      </div>
    </PageTransition>
  );
}
