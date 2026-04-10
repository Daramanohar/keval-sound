"use client";

import { motion } from "framer-motion";
import { Camera, Clapperboard, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

const useCases = [
  {
    title: "Filmmakers",
    icon: Clapperboard,
    description:
      "Source emotionally specific cues for trailers, short films, documentaries, and branded narratives without risking reused music.",
    accent: "from-zesty-red to-grey-magenta",
  },
  {
    title: "Content creators",
    icon: Camera,
    description:
      "Preview fast, purchase the exact songs you need, and protect your edits with exclusive ownership that keeps your channel sounding distinct.",
    accent: "from-vivid-blue to-mid-purple",
  },
  {
    title: "Musicians and producers",
    icon: Mic2,
    description:
      "Build sessions with regional inspiration, stems, samples, and exclusive songs you can reference, license, or develop into finished releases.",
    accent: "from-grey-azure to-mid-purple",
  },
];

export default function FeaturedArtists() {
  return (
    <section className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12 max-w-2xl"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-vivid-blue">
            Who It&apos;s For
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            Built for creators who need music with meaning and ownership
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            KEVAL SOUND is designed for people who cannot afford generic soundtracks, inconsistent licensing, or music that shows up in someone else&apos;s project tomorrow.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="glass-card rounded-3xl p-6"
            >
              <div
                className={cn(
                  "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                  useCase.accent
                )}
              >
                <useCase.icon className="h-6 w-6" />
              </div>
              <p className="text-lg font-semibold text-white">{useCase.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{useCase.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
