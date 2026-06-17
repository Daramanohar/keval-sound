import { Lock, Radio, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SectionHeader from "@/components/SectionHeader";

const previewStations = [
  "Creator Focus Radio",
  "Bollywood Spark Radio",
  "Cinematic Night Radio",
  "Lo-Fi Workroom Radio",
  "Electronic Motion Radio",
  "Desi Vibes Radio",
];

export default function RadioPage() {
  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vivid-blue/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 pt-12 pb-8">
          <SectionHeader
            title="Radio"
            subtitle="Always-on Keval stations for discovery, focus, and creator workflows."
            gradient
          />
        </div>
      </div>

      <div className="relative pb-16">
        <div className="pointer-events-none select-none opacity-15 blur-3xl">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {previewStations.map((station, index) => (
              <div key={station} className="glass-card overflow-hidden rounded-3xl p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-vivid-blue/40 to-grey-magenta/40">
                    <Radio className="h-6 w-6 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{station}</p>
                    <p className="mt-1 text-xs text-muted">Live programming slot {index + 1}</p>
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-vivid-blue to-mid-purple" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 top-4 z-10 flex justify-center px-4 md:top-12">
          <div className="max-w-2xl rounded-3xl border border-white/[0.12] bg-[#0c0d1c]/88 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-9">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vivid-blue/15 text-vivid-blue">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-vivid-blue">
              Radio coming soon
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">We are tuning Keval Radio for launch.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Our team is building curated stations, mood-led programming, and seamless preview flows so every session feels intentional. Radio will open once the listening experience is polished and reliable.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/75">
              <Sparkles className="h-3.5 w-3.5 text-dandelion" />
              Cooking carefully for creators
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
