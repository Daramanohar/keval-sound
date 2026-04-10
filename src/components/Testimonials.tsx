"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "Keval Sound changed how I source music for my films. The exclusive model means my soundtracks are truly unique — no other production will ever use the same track.",
    name: "Priya Sharma",
    role: "Independent Filmmaker",
    location: "Mumbai",
    rating: 5,
    gradient: "from-mid-purple to-vivid-blue",
  },
  {
    quote:
      "As a content creator, having exclusive rights to my background music is a game changer. The AI search found exactly the vibe I described in seconds.",
    name: "Rahul Verma",
    role: "YouTube Creator (2M subscribers)",
    location: "Delhi",
    rating: 5,
    gradient: "from-grey-magenta to-mid-purple",
  },
  {
    quote:
      "The quality of regional folk fusion tracks here is unmatched. I've licensed 15 tracks for my podcast series and each one is a masterpiece.",
    name: "Ananya Desai",
    role: "Podcast Producer",
    location: "Bengaluru",
    rating: 5,
    gradient: "from-vivid-blue to-grey-azure",
  },
];

export default function Testimonials() {
  return (
    <section className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium text-vivid-blue uppercase tracking-widest">
            Creator Stories
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
            Trusted by Creators{" "}
            <span className="gradient-text">Across India</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <div className="glass-card rounded-2xl p-7 h-full flex flex-col">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-vivid-blue/30 mb-4" />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 text-dandelion fill-dandelion"
                    />
                  ))}
                </div>

                {/* Quote text */}
                <p className="text-sm text-light-grey/80 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white",
                      t.gradient
                    )}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-[11px] text-muted">
                      {t.role} &middot; {t.location}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
