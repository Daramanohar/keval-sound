"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: ReactNode;
  href?: string;
  linkText?: string;
  className?: string;
  gradient?: boolean;
}

export default function SectionHeader({
  title,
  subtitle,
  badge,
  icon,
  href,
  linkText = "View All",
  className,
  gradient = false,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={cn("flex items-end justify-between mb-8", className)}
    >
      <div>
        {badge && (
          <span className="inline-block px-3 py-1 mb-3 rounded-full bg-vivid-blue/10 text-vivid-blue text-xs font-medium">
            {icon && <span className="mr-1.5 inline-flex">{icon}</span>}
            {badge}
          </span>
        )}
        <h2
          className={cn(
            "text-2xl md:text-3xl font-bold",
            gradient ? "gradient-text" : "text-white"
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1.5 text-sm text-vivid-blue hover:text-accent-hover transition-colors group shrink-0"
        >
          {linkText}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}
