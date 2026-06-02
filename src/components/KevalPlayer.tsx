"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Headphones,
  Heart,
  Lock,
  Pause,
  Play,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import type {
  CatalogCategory,
  ProductionPack,
  ProductionTrack,
} from "@/lib/production-catalog";
import { preloadProductionCatalog } from "@/lib/production-catalog-preload";
import { cn, formatDuration } from "@/lib/utils";
import KevalPlayerLoading from "./KevalPlayerLoading";
import TrackTagLine from "./TrackTagLine";

const INITIAL_PACK_ROWS = 4;
const PACK_ROW_BATCH_SIZE = 4;

type ProductionCatalogModule = typeof import("@/lib/production-catalog");

export default function KevalPlayer() {
  const [catalog, setCatalog] = useState<ProductionCatalogModule | null>(null);
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>("Occasion");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [packReveal, setPackReveal] = useState<{
    category: CatalogCategory;
    limit: number;
  }>({ category: "Occasion", limit: INITIAL_PACK_ROWS });
  const { toggleTrack, isItemPlaying } = usePlayerControls();
  const { addTrackToCart, isInWishlist, toggleTrackWishlist } = useStore();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    preloadProductionCatalog().then((module) => {
      if (!cancelled) setCatalog(module);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePacks = useMemo(
    () => catalog?.getProductionPacksByCategory(activeCategory) ?? [],
    [activeCategory, catalog]
  );
  const searchResults = useMemo(
    () => catalog?.searchProductionTracks(deferredQuery, { category: activeCategory, limit: 48 }) ?? [],
    [activeCategory, catalog, deferredQuery]
  );
  const hasQuery = deferredQuery.trim().length > 0;
  const visiblePackLimit =
    !hasQuery && packReveal.category === activeCategory ? packReveal.limit : INITIAL_PACK_ROWS;
  const displayedPacks = useMemo(
    () => (hasQuery ? visiblePacks : visiblePacks.slice(0, visiblePackLimit)),
    [hasQuery, visiblePackLimit, visiblePacks]
  );

  useEffect(() => {
    if (hasQuery || visiblePacks.length <= INITIAL_PACK_ROWS) return;

    let cancelled = false;
    let timer: number | undefined;

    const revealNextBatch = () => {
      setPackReveal((currentReveal) => {
        const currentLimit =
          currentReveal.category === activeCategory ? currentReveal.limit : INITIAL_PACK_ROWS;
        const nextLimit = Math.min(currentLimit + PACK_ROW_BATCH_SIZE, visiblePacks.length);

        if (nextLimit < visiblePacks.length && !cancelled) {
          timer = window.setTimeout(revealNextBatch, 140);
        }

        return { category: activeCategory, limit: nextLimit };
      });
    };

    timer = window.setTimeout(revealNextBatch, 180);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeCategory, hasQuery, visiblePacks.length]);

  const handlePlay = (track: ProductionTrack, pack?: ProductionPack | null) => {
    if (!track.streamReady) {
      showToast({
        tone: "info",
        title: "Cloud stream pending",
        description: "This real production song is indexed. Upload the production MP3s to enable playback.",
      });
      return;
    }

    toggleTrack(track, { queue: pack?.tracks ?? [track], pack: pack ?? undefined });
  };

  const handleUpgrade = () => {
    showToast({
      tone: "info",
      title: "WAV streaming tier",
      description: "The ₹49 Player subscription gate will unlock here after auth and payments are wired.",
    });
  };

  if (!catalog) {
    return <KevalPlayerLoading />;
  }

  const findPackForTrack = (track: ProductionTrack): ProductionPack | null =>
    catalog.productionPacks.find((pack) => pack.id === track.packId) ?? null;

  return (
    <div className="min-h-[calc(100vh-96px)] space-y-8 pb-28">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0c18]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,125,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(137,62,138,0.12),transparent_38%)]" />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vivid-blue/15 text-vivid-blue">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vivid-blue">
                    Keval Player
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                    Listen first. License when it lands.
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  `${catalog.productionCatalogStats.tracksReady.toLocaleString("en-IN")} real songs indexed`,
                  `${catalog.productionCatalogStats.instrumentalTracks.toLocaleString("en-IN")} instrumental`,
                  `${catalog.productionCatalogStats.lyricalTracks.toLocaleString("en-IN")} lyrical`,
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-vampire-black transition-transform hover:scale-[1.02]"
            >
              <Lock className="h-4 w-4" />
              ₹49 WAV Player
            </button>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 shadow-2xl shadow-black/20">
              <Sparkles className="h-4 w-4 shrink-0 text-vivid-blue" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by mood, instrument, genre, usage, metadata"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              <Search className="h-4 w-4 shrink-0 text-white/35" />
            </div>
            <div className="grid grid-cols-3 rounded-xl border border-white/[0.06] bg-white/[0.04]">
              <StatCell label="Packs" value={catalog.productionCatalogStats.packsReady} />
              <StatCell label="MP3" value={catalog.productionCatalogStats.mp3Tracks} />
              <StatCell label="WAV" value={catalog.productionCatalogStats.wavTracks} />
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[64px] z-20 -mx-6 border-y border-white/[0.04] bg-[#0c0d1c]/85 px-6 py-3 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {catalog.productionCategories.map((category) => {
            const active = activeCategory === category;
            const readyCount = catalog.getProductionPacksByCategory(category).filter(
              (pack) => pack.sourceStatus === "ready"
            ).length;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-vampire-black"
                    : "bg-white/[0.06] text-white/78 hover:bg-white/[0.1] hover:text-white"
                )}
              >
                {category}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-vampire-black/10" : "bg-white/[0.08] text-white/50"
                  )}
                >
                  {readyCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {query.trim() ? (
        <section className="space-y-4">
          <SectionTitle
            title="Search Matches"
            subtitle={`${searchResults.length} metadata-ranked results in ${activeCategory}`}
          />
          {searchResults.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {searchResults.map((track) => (
                <SearchResultRow
                  key={track.id}
                  track={track}
                  pack={findPackForTrack(track)}
                  isPlaying={isItemPlaying(track.id, "track")}
                  onPlay={handlePlay}
                  onAddToCart={() => addTrackToCart(track)}
                  saved={isInWishlist(track.id, "track")}
                  onToggleSave={() => toggleTrackWishlist(track)}
                />
              ))}
            </div>
          ) : (
            <EmptyState label="No metadata matches in this category yet" />
          )}
        </section>
      ) : (
        <section className="space-y-8">
          <SectionTitle
            title={`${activeCategory} Packs`}
            subtitle={
              activeCategory === "Occasion"
                ? "Default listening surface for creator intent, background use, and situation-based discovery"
                : "Production source folders only; pending categories appear without placeholder songs"
            }
          />

          {displayedPacks.map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              isItemPlaying={isItemPlaying}
              onPlay={handlePlay}
              onAddToCart={addTrackToCart}
              isSaved={(track) => isInWishlist(track.id, "track")}
              onToggleSave={toggleTrackWishlist}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col justify-center border-r border-white/[0.05] px-3 py-2 last:border-r-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <span className="text-base font-bold text-white">{value.toLocaleString("en-IN")}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function PackRow({
  pack,
  isItemPlaying,
  onPlay,
  onAddToCart,
  isSaved,
  onToggleSave,
}: {
  pack: ProductionPack;
  isItemPlaying: (id: string, type?: "track" | "sample") => boolean;
  onPlay: (track: ProductionTrack, pack: ProductionPack) => void;
  onAddToCart: (track: ProductionTrack) => void;
  isSaved: (track: ProductionTrack) => boolean;
  onToggleSave: (track: ProductionTrack) => void;
}) {
  return (
    <div className="space-y-3" style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/pack/${pack.id}`}
            className="inline-flex max-w-full items-center gap-2 text-lg font-bold text-white transition-colors hover:text-vivid-blue"
          >
            <span className="truncate">{pack.title}</span>
            {pack.sourceStatus === "pending" ? (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                Syncing
              </span>
            ) : null}
          </Link>
          <p className="text-xs text-muted">
            {pack.availableTrackCount.toLocaleString("en-IN")} indexed songs · {pack.category}
          </p>
        </div>
      </div>

      {pack.tracks.length ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide overscroll-x-contain">
          {pack.tracks.map((track) => (
            <TrackTile
              key={track.id}
              track={track}
              pack={pack}
              isPlaying={isItemPlaying(track.id, "track")}
              saved={isSaved(track)}
              onPlay={onPlay}
              onAddToCart={onAddToCart}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <EmptyState label="Production source for this pack has not landed locally yet" />
      )}
    </div>
  );
}

function TrackTile({
  track,
  pack,
  isPlaying,
  saved,
  onPlay,
  onAddToCart,
  onToggleSave,
}: {
  track: ProductionTrack;
  pack: ProductionPack;
  isPlaying: boolean;
  saved: boolean;
  onPlay: (track: ProductionTrack, pack: ProductionPack) => void;
  onAddToCart: (track: ProductionTrack) => void;
  onToggleSave: (track: ProductionTrack) => void;
}) {
  return (
    <article className="group w-[174px] shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035]">
      <div className="relative aspect-square overflow-hidden bg-white/[0.04]">
        <Image
          src={track.coverUrl}
          alt=""
          fill
          sizes="180px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/80 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => onPlay(track, pack)}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-vampire-black shadow-xl transition-transform hover:scale-105"
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        {!track.streamReady ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase text-white/75 backdrop-blur">
            Sync
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-full bg-white/[0.14] px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {track.isInstrumental ? "Instrumental" : "Lyrical"}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="min-h-[44px]">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{track.title}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{track.mood} · {track.bpm} BPM</p>
          <TrackTagLine track={track} className="mt-1 gap-x-1.5 text-[10px] text-muted/50" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(track)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.06] text-muted hover:text-white"
            )}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={() => onAddToCart(track)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full bg-vivid-blue/15 px-3 text-xs font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/25"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            ₹99
          </button>
        </div>
      </div>
    </article>
  );
}

function SearchResultRow({
  track,
  pack,
  isPlaying,
  saved,
  onPlay,
  onAddToCart,
  onToggleSave,
}: {
  track: ProductionTrack;
  pack: ProductionPack | null;
  isPlaying: boolean;
  saved: boolean;
  onPlay: (track: ProductionTrack, pack?: ProductionPack | null) => void;
  onAddToCart: () => void;
  onToggleSave: () => void;
}) {
  return (
    <article className="flex min-w-0 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
        <Image src={track.coverUrl} alt="" fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
        <p className="truncate text-xs text-muted">
          {track.packTitle} · {track.mood} · {formatDuration(track.duration)}
        </p>
        <TrackTagLine track={track} className="mt-2 text-[10px] text-white/55" />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleSave()}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            saved ? "bg-zesty-red/15 text-zesty-red" : "bg-white/[0.06] text-muted hover:text-white"
          )}
          aria-label={saved ? "Remove from wishlist" : "Save"}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-white sm:flex"
          aria-label="Add to cart"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPlay(track, pack)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-vampire-black transition-transform hover:scale-105"
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.025] px-5 py-8 text-center text-sm text-muted">
      {label}
    </div>
  );
}
