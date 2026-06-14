"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";
import PackCard from "@/components/PackCard";
import {
  productionCategories,
  readyProductionPacks,
} from "@/lib/production-catalog";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", ...productionCategories] as const;
type PackCategoryFilter = (typeof CATEGORIES)[number];

function isValidCategory(value: string | null): value is PackCategoryFilter {
  return value != null && (CATEGORIES as readonly string[]).includes(value);
}

function PacksContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialCategory: PackCategoryFilter = isValidCategory(categoryParam)
    ? categoryParam
    : "All";
  const [activeCategory, setActiveCategory] = useState<PackCategoryFilter>(initialCategory);

  const filteredPacks =
    activeCategory === "All"
      ? readyProductionPacks
      : readyProductionPacks.filter((p) => p.category === activeCategory);

  return (
    <PageTransition>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-grey-magenta/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 pt-8 pb-6">
          <SectionHeader title="Song Packs" gradient />
          <p className="mt-2 text-sm text-muted">
            Browse live production packs from the cloud catalog.
          </p>

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
            <h3 className="text-lg font-semibold text-white mb-2">No live packs in this category yet</h3>
            <p className="text-sm text-muted">This category will appear here after its production files are uploaded.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default function PacksPage() {
  return (
    <Suspense fallback={null}>
      <PacksContent />
    </Suspense>
  );
}
