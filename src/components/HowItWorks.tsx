"use client";

import { motion } from "framer-motion";
import { ArrowRight, Crown, Search, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Search or Discover",
    description:
      "Use AI-assisted search to find the right sound by mood, genre, BPM, language, or instrumentation, then move straight into preview mode.",
    accent: "from-vivid-blue to-mid-purple",
    glow: "bg-vivid-blue/10",
  },
  {
    number: "02",
    icon: ShoppingCart,
    title: "Preview and Purchase",
    description:
      "Preview songs or full packs, then add the exact tracks you need to cart. Buy a bundle or mix individual tracks in one clean checkout flow.",
    accent: "from-mid-purple to-grey-magenta",
    glow: "bg-mid-purple/10",
  },
  {
    number: "03",
    icon: Crown,
    title: "Own Permanently",
    description:
      "Every completed order creates a KEVAL SOUND license record and removes the asset from the live catalog, giving you true exclusive ownership.",
    accent: "from-grey-magenta to-zesty-red",
    glow: "bg-grey-magenta/10",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative z-10 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-vivid-blue">
            How It Works
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            A creator-friendly path from <span className="gradient-text">search to ownership</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Search, preview, purchase, and own permanently without confusing negotiations or reused music.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.14, duration: 0.45 }}
              className="relative group"
            >
              {index < 2 ? (
                <div className="absolute left-[60%] right-[-40%] top-12 hidden h-px md:block">
                  <div className="h-full bg-gradient-to-r from-border to-transparent" />
                  <ArrowRight className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-border" />
                </div>
              ) : null}

              <div className="glass-card relative h-full overflow-hidden rounded-2xl p-8">
                <div
                  className={cn(
                    "absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-[80px] transition-opacity duration-700 group-hover:opacity-100",
                    step.glow
                  )}
                />

                <div className="relative z-10">
                  <div className="mb-6 flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br",
                        step.accent
                      )}
                    >
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-white/10">{step.number}</span>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
