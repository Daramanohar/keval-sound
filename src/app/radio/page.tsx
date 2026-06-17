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
      <div className="relative overflow-hidden rounded-3xl border border-vivid-blue/10 bg-vampire-black">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mid-purple/18 via-vampire-black to-vampire-black" />
        <div className="pointer-events-none absolute right-[-8%] top-[-20%] h-72 w-72 rounded-full bg-grey-magenta/18 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-18%] left-[-8%] h-72 w-72 rounded-full bg-vivid-blue/12 blur-3xl" />

        <div className="relative z-10 px-6 pt-10 md:px-8 md:pt-12">
          <SectionHeader
            title="Radio"
            subtitle="Always-on Keval stations for discovery, focus, and creator workflows."
            gradient
          />
        </div>

        <div className="relative z-10 grid min-h-[560px] items-center gap-8 px-6 pb-36 pt-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,520px)]">
          <div className="pointer-events-none select-none opacity-45">
            <div className="grid gap-4 md:grid-cols-2">
            {previewStations.map((station, index) => (
              <div
                key={station}
                className="overflow-hidden rounded-2xl border border-vivid-blue/10 bg-mid-purple/12 p-5 shadow-xl shadow-vampire-black/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dandelion/20 bg-dandelion/10">
                    <Radio className="h-6 w-6 text-dandelion" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-light-grey">{station}</p>
                    <p className="mt-1 text-xs text-muted">Launch station {index + 1}</p>
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-vampire-black/70">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-dandelion via-zesty-red to-grey-magenta" />
                </div>
              </div>
            ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-dandelion/20 bg-vampire-black/92 p-6 text-center shadow-2xl shadow-grey-magenta/20 backdrop-blur-xl md:p-9">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-vivid-blue/20 bg-vivid-blue/12 text-vivid-blue">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-dandelion">
              Radio coming soon
            </p>
            <h2 className="mt-3 text-3xl font-bold text-light-grey">We are tuning Keval Radio for launch.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Our team is building curated stations, mood-led programming, and seamless preview flows so every session feels intentional. Radio will open once the listening experience is polished and reliable.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zesty-red/25 bg-zesty-red/10 px-4 py-2 text-xs font-semibold text-light-grey/80">
              <Sparkles className="h-3.5 w-3.5 text-dandelion" />
              Cooking carefully for creators
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
