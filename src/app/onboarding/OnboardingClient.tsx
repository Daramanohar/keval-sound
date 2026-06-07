"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Film,
  Gamepad2,
  Heart,
  Loader2,
  Megaphone,
  Music2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import KevalLogo from "@/components/KevalLogo";
import { saveOnboarding } from "./actions";

const USE_CASES = [
  {
    id: "films-videos",
    label: "Films / Videos",
    blurb: "Score scenes, trailers, and edits.",
    icon: Film,
  },
  {
    id: "social-content",
    label: "Social Content",
    blurb: "Reels, Shorts, YouTube.",
    icon: Camera,
  },
  {
    id: "ads-brands",
    label: "Ads / Brands",
    blurb: "Commercials and brand films.",
    icon: Megaphone,
  },
  {
    id: "games-apps",
    label: "Games / Apps",
    blurb: "In-game cues and UX moments.",
    icon: Gamepad2,
  },
  {
    id: "personal",
    label: "Personal Projects",
    blurb: "Just vibing or building.",
    icon: Heart,
  },
] as const;

const SOUND_INTERESTS = [
  { id: "hip-hop-rap", label: "Hip-Hop / Rap" },
  { id: "pop", label: "Pop" },
  { id: "edm", label: "EDM" },
  { id: "bollywood", label: "Bollywood" },
  { id: "indie", label: "Indie" },
  { id: "culture", label: "Culture" },
  { id: "classic", label: "Classic" },
  { id: "occasion", label: "Occasion" },
] as const;

type Step = 1 | 2;

const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
  }),
};

export default function OnboardingClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [sounds, setSounds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleSound = useCallback((id: string) => {
    setSounds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }, []);

  const canContinueStep1 = Boolean(useCase);
  const canFinish = sounds.length > 0;

  const goNext = useCallback(() => {
    if (!canContinueStep1) return;
    setDirection(1);
    setStep(2);
  }, [canContinueStep1]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep(1);
  }, []);

  const handleFinish = useCallback(() => {
    if (!useCase || !canFinish || isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await saveOnboarding({ useCase, sounds });
      if (!result.ok) {
        setError(
          result.error === "unauthorized"
            ? "Session expired. Please sign in again."
            : "Couldn't save your preferences. Try again in a moment."
        );
        return;
      }

      // Reload Clerk's cached user so downstream reads see publicMetadata.
      // (No-op if user isn't loaded yet — server has the source of truth.)
      try {
        await user?.reload();
      } catch {
        // Non-fatal; server metadata is already persisted.
      }

      router.replace("/browse");
    });
  }, [canFinish, isPending, router, sounds, useCase, user]);

  const skipForNow = useCallback(() => {
    router.replace("/browse");
  }, [router]);

  const progress = useMemo(() => (step === 1 ? 50 : 100), [step]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vampire-black">
        <Loader2 className="h-6 w-6 animate-spin text-vivid-blue" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-vampire-black text-light-grey">
      {/* Ambient gradient field */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full bg-mid-purple/20 blur-[140px] animate-pulse-glow" />
        <div
          className="absolute -right-24 bottom-0 h-[460px] w-[460px] rounded-full bg-vivid-blue/15 blur-[120px] animate-pulse-glow"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-grey-magenta/10 blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <KevalLogo size="sm" showTagline={false} />
        <button
          type="button"
          onClick={skipForNow}
          className="text-xs font-medium text-muted hover:text-white transition-colors"
        >
          Skip for now
        </button>
      </header>

      <main className="relative z-10 mx-auto flex max-w-2xl flex-col px-5 pb-16 pt-4 sm:px-6">
        {/* Progress meter */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted/60">
            <span>Step {step} of 2</span>
            <span className="flex items-center gap-1.5 text-vivid-blue">
              <Sparkles className="h-3 w-3" />
              Personalising your catalog
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-vivid-blue to-mid-purple"
            />
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === 1 ? (
              <motion.section
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white sm:text-4xl">
                    What are you creating today?
                  </h1>
                  <p className="mt-3 max-w-lg text-sm text-muted">
                    Pick the format closest to your project. We&apos;ll surface tracks
                    that fit the brief first.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {USE_CASES.map(({ id, label, blurb, icon: Icon }) => {
                    const selected = useCase === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setUseCase(id)}
                        aria-pressed={selected}
                        className={cn(
                          "group relative flex items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all",
                          selected
                            ? "border-vivid-blue/60 bg-vivid-blue/[0.08] shadow-lg shadow-vivid-blue/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                        )}
                      >
                        {selected && (
                          <motion.div
                            layoutId="use-case-glow"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vivid-blue/10 via-transparent to-mid-purple/10"
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                          />
                        )}
                        <div
                          className={cn(
                            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                            selected
                              ? "bg-vivid-blue text-white"
                              : "bg-white/[0.05] text-muted group-hover:text-white"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{label}</p>
                          <p className="mt-0.5 text-[11px] text-muted/80">{blurb}</p>
                        </div>
                        <div
                          className={cn(
                            "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                            selected
                              ? "border-vivid-blue bg-vivid-blue text-white"
                              : "border-white/15"
                          )}
                          aria-hidden="true"
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-10 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinueStep1}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                      canContinueStep1
                        ? "bg-gradient-to-r from-vivid-blue to-mid-purple text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
                        : "cursor-not-allowed bg-white/[0.04] text-muted/50"
                    )}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white sm:text-4xl">
                    Which sounds should we tune your experience around?
                  </h1>
                  <p className="mt-3 max-w-lg text-sm text-muted">
                    Pick as many as you like. You can fine-tune these any time from
                    your account.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {SOUND_INTERESTS.map(({ id, label }) => {
                    const selected = sounds.includes(id);
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleSound(id)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                          selected
                            ? "border-vivid-blue/60 bg-vivid-blue/[0.12] text-white shadow-lg shadow-vivid-blue/10"
                            : "border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/[0.16] hover:text-white"
                        )}
                      >
                        <Music2 className="h-3.5 w-3.5" />
                        {label}
                        {selected && <Check className="h-3.5 w-3.5 text-vivid-blue" />}
                      </motion.button>
                    );
                  })}
                </div>

                {sounds.length > 0 && (
                  <p className="mt-5 text-xs text-muted/80">
                    {sounds.length} selected
                  </p>
                )}

                {error && (
                  <p className="mt-6 rounded-xl bg-zesty-red/10 px-4 py-3 text-xs text-zesty-red">
                    {error}
                  </p>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-white transition-colors disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={!canFinish || isPending}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                      canFinish && !isPending
                        ? "bg-gradient-to-r from-vivid-blue to-mid-purple text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
                        : "cursor-not-allowed bg-white/[0.04] text-muted/50"
                    )}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        Finish
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
