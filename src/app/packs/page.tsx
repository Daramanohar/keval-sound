"use client";

import { useState } from "react";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";
import PackCard from "@/components/PackCard";
import { packs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const categories = ["All", "Featured", "Bollywood", "Hip Hop", "Electronic", "Folk Fusion", "Lo-fi"];

export default function PacksPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPacks = packs.filter((pack) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Featured") return pack.featured;
    return pack.genre === activeCategory;
  });

  return (
    <PageTransition>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-grey-magenta/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-8">
          <SectionHeader
            title="Song Packs"
            subtitle="Curated collections of 25+ tracks at massive discounts. One purchase, total exclusivity."
            gradient
          />

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
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

      {/* Packs Grid */}
      <div className="mx-auto max-w-7xl px-6 pb-16">
        {filteredPacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPacks.map((pack, i) => (
              <PackCard key={pack.id} pack={pack} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <h3 className="text-lg font-semibold text-white mb-2">
              No packs in this category
            </h3>
            <p className="text-sm text-muted">
              Check back soon — new packs are added weekly.
            </p>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-16 glass rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-mid-purple/10 via-transparent to-grey-magenta/10 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-3">
              How Packs Work
            </h3>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Each pack contains 25+ carefully curated tracks. When you purchase a
              pack, every track inside becomes exclusively yours — they are
              permanently removed from the catalog. Save up to 50% compared to
              individual purchases.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              {[
                { value: "25+", label: "Tracks per Pack" },
                { value: "50%", label: "Average Savings" },
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
