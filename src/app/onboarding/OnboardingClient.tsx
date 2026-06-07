"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
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

const USE_CASES = [
  { id: "films-videos", label: "Films / Videos", icon: Film },
  { id: "social-content", label: "Social Content", icon: Camera },
  { id: "ads-brands", label: "Ads / Brands", icon: Megaphone },
  { id: "games-apps", label: "Games / Apps", icon: Gamepad2 },
  { id: "personal", label: "Personal Projects", icon: Heart },
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

export default function OnboardingClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [sounds, setSounds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSound = useCallback((id: string) => {
    setSounds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }, []);

  const canContinueStep1 = Boolean(useCase);
  const canFinish = sounds.length > 0;

  const handleFinish = useCallback(async () => {
    if (!user || !canFinish || saving) return;

    setSaving(true);
    setError(null);

    try {
      // Store onboarding answers on Clerk public metadata so any future
      // server component / API can read them without an extra DB call.
      // We use `unsafeMetadata` because it's user-writable from the client.
      // Move to a server action + `publicMetadata` once the DB ships.
      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata ?? {}),
          onboarding: {
            useCase,
            sounds,
            completedAt: new Date().toISOString(),
          },
        },
      });
      router.replace("/browse");
    } catch (err) {
      console.error("[onboarding] failed to save", err);
      setError("Couldn't save your preferences. Try again in a moment.");
      setSaving(false);
    }
  }, [canFinish, router, saving, sounds, useCase, user]);

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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full bg-mid-purple/20 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 h-[460px] w-[460px] rounded-full bg-vivid-blue/15 blur-[120px]" />
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

      <main className="relative z-10 mx-auto flex max-w-2xl flex-col px-6 pb-16 pt-6">
        {/* Progress bar */}
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
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-vivid-blue to-mid-purple"
            />
          </div>
        </div>

        {step === 1 && (
          <motion.section
            key="step-1"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                What kind of music do you create with?
              </h1>
              <p className="mt-3 max-w-lg text-sm text-muted">
                Pick the format closest to what you usually build. We&apos;ll lead with
                tracks that fit.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {USE_CASES.map(({ id, label, icon: Icon }) => {
                const selected = useCase === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUseCase(id)}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                      selected
                        ? "border-vivid-blue/60 bg-vivid-blue/[0.08] shadow-lg shadow-vivid-blue/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    )}
                    aria-pressed={selected}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                        selected
                          ? "bg-vivid-blue text-white"
                          : "bg-white/[0.05] text-muted group-hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{label}</p>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 text-vivid-blue" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
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
        )}

        {step === 2 && (
          <motion.section
            key="step-2"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Which sounds are you most interested in?
              </h1>
              <p className="mt-3 max-w-lg text-sm text-muted">
                Pick as many as you like. You can change these later from your account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {SOUND_INTERESTS.map(({ id, label }) => {
                const selected = sounds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
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
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="mt-6 rounded-xl bg-zesty-red/10 px-4 py-3 text-xs text-zesty-red">
                {error}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-muted hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish || saving}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                  canFinish && !saving
                    ? "bg-gradient-to-r from-vivid-blue to-mid-purple text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
                    : "cursor-not-allowed bg-white/[0.04] text-muted/50"
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Briefcase className="h-4 w-4" />
                    Take me in
                  </>
                )}
              </button>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
