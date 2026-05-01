"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useAuth } from "@/lib/auth-context";
import { packs, tracks, type Track } from "@/lib/mock-data";
import GenreShowcase from "@/components/GenreShowcase";
import HowItWorks from "@/components/HowItWorks";
import FeaturedArtists from "@/components/FeaturedArtists";
import Testimonials from "@/components/Testimonials";
import StatsCounter from "@/components/StatsCounter";
import PageTransition from "@/components/PageTransition";
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
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}

function LandingPage() {
  const featuredPreviewPacks = packs.slice(0, 3);

  return (
    <PageTransition>
      <section className="relative flex min-h-[95vh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 -left-32 h-[600px] w-[600px] rounded-full bg-mid-purple/20 blur-[150px] animate-pulse-glow" />
          <div
            className="absolute bottom-1/3 -right-24 h-[500px] w-[500px] rounded-full bg-grey-magenta/15 blur-[120px] animate-pulse-glow"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vivid-blue/8 blur-[100px] animate-pulse-glow"
            style={{ animationDelay: "3s" }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="mb-8 inline-flex items-center gap-2 rounded-full bg-vivid-blue/10 px-4 py-2 text-sm font-medium text-vivid-blue">
                <Zap className="h-4 w-4" />
                Exclusive Indian Music Ownership
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Discover the song. <span className="gradient-text">Own it forever.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted"
            >
              KEVAL SOUND gives filmmakers, content creators, and musicians exclusive Indian music they can preview instantly, purchase track by track or as a full pack, and keep permanently.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="mt-10 flex justify-center"
            >
              <Link
                href="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-8 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-vivid-blue/20"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="mt-12 flex items-center justify-center gap-6 text-sm text-muted"
            >
              <div className="flex -space-x-2">
                {["bg-vivid-blue", "bg-mid-purple", "bg-grey-magenta", "bg-grey-azure", "bg-zesty-red"].map(
                  (bg, index) => (
                    <div
                      key={bg}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-vampire-black ${bg} text-[10px] font-bold text-white`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                  )
                )}
              </div>
              <span>
                Trusted by <span className="font-medium text-white">2,400+</span> creators building distinctive soundtracks.
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Exclusive ownership",
              description: "When you purchase a track or pack, it leaves the public catalog and becomes yours permanently.",
            },
            {
              title: "Regional depth",
              description: "Discover premium sounds rooted in Indian languages, instruments, and regional production styles.",
            },
            {
              title: "AI-powered discovery",
              description: "Search by mood, BPM, instrumentation, language, or brief, then preview the closest matches instantly.",
            },
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="glass-card rounded-3xl p-6"
            >
              <p className="text-sm font-semibold text-white">{card.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <GenreShowcase />
      <HowItWorks />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-widest text-vivid-blue">
            Featured Content Preview
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            Preview premium bundles before you buy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Explore pack-level previews, compare genres, and decide whether you want the full bundle or the exact individual songs inside it.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredPreviewPacks.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03]"
            >
              <div className="relative aspect-square overflow-hidden">
                {pack.coverUrl.startsWith("/") ? (
                  <NextImage
                    src={pack.coverUrl}
                    alt={pack.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${pack.coverUrl}`} />
                )}
              </div>
              <div className="p-5">
                <p className="text-lg font-semibold text-white">{pack.title}</p>
                <p className="mt-1 text-xs text-muted">{pack.category}</p>
                <Link
                  href={`/pack/${pack.id}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-vivid-blue transition-colors hover:text-accent-hover"
                >
                  Open Pack
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <StatsCounter />
      <FeaturedArtists />
      <Testimonials />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl glass p-12 text-center md:p-20"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mid-purple/15 via-transparent to-vivid-blue/10" />
          <div className="relative z-10">
            <Sparkles className="mx-auto mb-6 h-8 w-8 text-dandelion" />
            <h2 className="mb-4 text-3xl font-bold leading-tight text-white md:text-5xl">
              Ready to build with music that <span className="gradient-text">nobody else can license?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-lg text-muted">
              Create your account to search, preview, purchase, and permanently own exclusive Indian music.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-10 py-4 text-lg font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-vivid-blue/25"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </section>
    </PageTransition>
  );
}

function AuthenticatedHome() {
  const allTracks = useMemo(() => tracks, []);
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
  const moodDrops = useMemo(() => [...allTracks].sort((a, b) => a.bpm - b.bpm), [allTracks]);
  const stageBuilders = useMemo(() => [...allTracks].sort((a, b) => b.bpm - a.bpm), [allTracks]);
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
          {packs.map((pack, index) => (
            <Link
              key={pack.id}
              href={`/pack/${pack.id}`}
              className="group snap-start flex-shrink-0 w-[160px]"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className="overflow-hidden rounded-2xl border border-transparent bg-white/[0.03] transition-all hover:border-white/[0.08]"
              >
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
              </motion.div>
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
              <MusicCard track={track} index={index} variant="compact" />
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
              <MusicCard track={track} index={index} variant="compact" />
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
