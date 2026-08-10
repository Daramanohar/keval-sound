"use client";

import { useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { redirect } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { type Track } from "@/lib/mock-data";
import { productionHomePacks, productionHomeTracks } from "@/lib/production-home.generated";
import HeroCarousel from "@/components/HeroCarousel";
import ContentSection from "@/components/ContentSection";
import MusicCard from "@/components/MusicCard";
import TrendingDiscoveryPanel from "@/components/TrendingDiscoveryPanel";
import StickySidebar from "@/components/StickySidebar";
function ensureMinimumTracks(primary: Track[], fallback: Track[], minimum = 8) {
  if (primary.length >= minimum) return primary;

  const seen = new Set(primary.map((track) => track.id));
  const filler = fallback.filter((track) => !seen.has(track.id));

  return [...primary, ...filler].slice(0, minimum);
}

export default function HomePage() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  return <AuthenticatedHome />;
}

function AuthenticatedHome() {
  const allTracks = useMemo(() => productionHomeTracks, []);
  const livePacks = useMemo(() => productionHomePacks, []);
  const trendingTracks = useMemo(
    () => ensureMinimumTracks(allTracks.filter((track) => track.isTrending), allTracks),
    [allTracks]
  );
  const sellingFast = useMemo(
    () => ensureMinimumTracks(allTracks.filter((track) => track.isSellingFast), allTracks),
    [allTracks]
  );
  const freshFinds = useMemo(() => allTracks.slice(4, 12), [allTracks]);
  const regionalRoots = useMemo(() => allTracks.slice(0, 8), [allTracks]);
  const sonicSelections = useMemo(() => allTracks.slice(0, 10).reverse(), [allTracks]);
  const moodDrops = useMemo(() => allTracks.slice(8, 18), [allTracks]);
  const stageBuilders = useMemo(() => allTracks.slice(12, 22), [allTracks]);
  const sampleLabTracks = useMemo(() => allTracks.slice(2, 10), [allTracks]);

  return (
    <div className="space-y-6">
      {/* Hero spans full width above the two-column layout */}
      <div className="w-full rounded-2xl overflow-hidden">
        <HeroCarousel />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
      <div className="flex-1 min-w-0 space-y-8">
        <ContentSection
          title="Trending Now"
          badge="Hot"
          badgeColor="bg-zesty-red/10 text-zesty-red"
          subtitle="Most previewed songs this week across India"
          href="/explore?section=trending"
          linkText="See All"
        >
          {trendingTracks.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={trendingTracks} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Vanishing Drops"
          badge="Limited"
          badgeColor="bg-dandelion/10 text-dandelion"
          subtitle="Songs and bundles creators are moving on before the catalog closes"
          href="/explore?section=vanishing"
          linkText="See All"
        >
          {sellingFast.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={sellingFast} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Fresh Finds"
          badge="New"
          badgeColor="bg-vivid-blue/10 text-vivid-blue"
          subtitle="Fresh arrivals available for immediate ownership"
          href="/explore"
        >
          {freshFinds.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={freshFinds} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Regional Roots"
          badge="Desi"
          badgeColor="bg-grey-azure/10 text-grey-azure"
          subtitle="Authentic sounds from every corner of India"
          href="/explore"
        >
          {regionalRoots.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={regionalRoots} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Sonic Selections"
          badge="Curated"
          badgeColor="bg-mid-purple/20 text-mid-purple"
          subtitle="Editorial picks for film, branded content, and premium storytelling"
          href="/explore"
        >
          {sonicSelections.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={sonicSelections} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Mood Drops"
          badge="Vibe"
          badgeColor="bg-grey-magenta/10 text-grey-magenta"
          subtitle="Set the scene with emotionally tuned song selections"
          href="/explore"
        >
          {moodDrops.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={moodDrops} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Exclusive Vaults"
          badge="Packs"
          badgeColor="bg-dandelion/10 text-dandelion"
          subtitle="Full bundles with previewable songs and better value than individual checkout"
          href="/packs"
          linkText="Browse all packs"
        >
          {livePacks.map((pack) => (
            <Link
              key={pack.id}
              href={`/pack/${pack.id}`}
              className="group snap-start flex-shrink-0 w-[160px]"
            >
              <div className="overflow-hidden rounded-2xl border border-transparent bg-white/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.08]">
                <div className="relative aspect-square overflow-hidden">
                  {pack.coverUrl.startsWith("/") ? (
                    <NextImage
                      src={pack.coverUrl}
                      alt={pack.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="200px"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${pack.coverUrl} transition-transform duration-700 group-hover:scale-110`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-vampire-black/80 to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="truncate text-xs font-bold text-white">{pack.title}</p>
                    <p className="text-[10px] text-white/55">{pack.category}</p>
                  </div>
                  {pack.featured ? (
                    <span className="absolute right-2 top-2 rounded-full bg-dandelion/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-vampire-black">
                      Featured
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </ContentSection>

        <ContentSection
          title="Stage Builders"
          badge="High Energy"
          badgeColor="bg-zesty-red/10 text-zesty-red"
          subtitle="Tracks built for live performance, sports edits, and anthem moments"
          href="/explore"
        >
          {stageBuilders.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={stageBuilders} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>

        <ContentSection
          title="Sample Lab"
          badge="Loops & Stems"
          badgeColor="bg-grey-azure/10 text-grey-azure"
          subtitle="Production-grade samples, loops, and one-shots for session work"
          href="/samples"
          linkText="Browse samples"
        >
          {sampleLabTracks.map((track, index) => (
            <div key={track.id} className="snap-start flex-shrink-0 w-[160px]">
              <MusicCard track={track} queue={sampleLabTracks} index={index} variant="compact" />
            </div>
          ))}
        </ContentSection>
      </div>

      <div className="w-full lg:w-[320px] lg:shrink-0">
        <StickySidebar topOffset={96} bottomOffset={16}>
          <TrendingDiscoveryPanel />
        </StickySidebar>
      </div>
    </div>
    </div>
  );
}
