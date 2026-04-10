"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Headphones, Globe, Users, Shield } from "lucide-react";

function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf: number;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);

  return count;
}

const stats = [
  {
    icon: Headphones,
    value: 10000,
    suffix: "+",
    label: "Exclusive Tracks",
    description: "Premium Indian music across every genre",
  },
  {
    icon: Globe,
    value: 22,
    suffix: "+",
    label: "Indian Languages",
    description: "Regional sounds from every state",
  },
  {
    icon: Users,
    value: 500,
    suffix: "+",
    label: "Regional Artists",
    description: "Independent producers and musicians",
  },
  {
    icon: Shield,
    value: 100,
    suffix: "%",
    label: "Exclusive Ownership",
    description: "Once purchased, permanently removed",
  },
];

export default function StatsCounter() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden">
          {/* Background accents */}
          <div className="absolute inset-0 bg-gradient-to-br from-mid-purple/10 via-transparent to-vivid-blue/5 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <StatItem
                key={stat.label}
                stat={stat}
                index={i}
                inView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  stat,
  index,
  inView,
}: {
  stat: (typeof stats)[0];
  index: number;
  inView: boolean;
}) {
  const count = useCountUp(stat.value, 2000 + index * 300, inView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="text-center"
    >
      <stat.icon className="w-6 h-6 text-vivid-blue mx-auto mb-3" />
      <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">
        {count.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="text-sm font-medium text-white mt-2">{stat.label}</p>
      <p className="text-xs text-muted mt-1">{stat.description}</p>
    </motion.div>
  );
}
