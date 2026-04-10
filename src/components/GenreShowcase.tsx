"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const discoveryLanes = [
  {
    name: "Bollywood cinematic",
    tracks: "2,400+",
    description: "Romance, drama, tension, and dance-ready cues built for screen storytelling.",
    gradient: "from-zesty-red via-grey-magenta to-mid-purple",
  },
  {
    name: "Regional roots",
    tracks: "1,900+",
    description: "Punjabi, Tamil, Bengali, Gujarati, Marathi, and other regional textures with real cultural identity.",
    gradient: "from-mud-brown via-zesty-red to-dandelion",
  },
  {
    name: "Desi hip-hop and trap",
    tracks: "1,500+",
    description: "Street-ready drums, heavy bass, and contemporary vocal space for bold creator-led releases.",
    gradient: "from-vampire-black via-mid-purple to-vivid-blue",
  },
  {
    name: "Ambient and folk fusion",
    tracks: "1,200+",
    description: "Lo-fi, acoustic, devotional, and hybrid arrangements designed for atmosphere and emotion.",
    gradient: "from-grey-azure via-vivid-blue to-mid-purple",
  },
];

export default function GenreShowcase() {
  return (
    <section className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-widest text-vivid-blue">
              Value Proposition
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
              Regional music discovery with premium context built in
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              KEVAL SOUND combines exclusive ownership, regional music depth, and AI-assisted discovery so you can find the exact sound for the story you are building.
            </p>
          </div>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 text-sm font-semibold text-vivid-blue transition-colors hover:text-accent-hover"
          >
            Start discovering
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {discoveryLanes.map((lane, index) => (
            <motion.div
              key={lane.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="group overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03]"
            >
              <div className={cn("h-28 bg-gradient-to-br", lane.gradient)} />
              <div className="p-5">
                <p className="text-sm font-semibold text-white">{lane.name}</p>
                <p className="mt-1 text-xs font-medium text-vivid-blue">{lane.tracks} source-ready cues</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{lane.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
