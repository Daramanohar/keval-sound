"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface KevalLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export default function KevalLogo({
  size = "md",
  showText = true,
  showTagline = true,
  className,
}: KevalLogoProps) {
  const sizes = {
    sm: { px: 32, title: "text-sm", tag: "text-[8px]", gap: "gap-2.5" },
    md: { px: 40, title: "text-base", tag: "text-[9px]", gap: "gap-3" },
    lg: { px: 56, title: "text-2xl", tag: "text-[10px]", gap: "gap-3.5" },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <div className="relative shrink-0" style={{ width: s.px, height: s.px }}>
        <Image
          src="/logo/keval-logo.png"
          alt="Keval Sound"
          width={s.px}
          height={s.px}
          className="object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col overflow-hidden">
          <span className={cn("font-bold tracking-wider text-white leading-tight", s.title)}>
            Keval <span className="gradient-text">Sound</span>
          </span>
          {showTagline && (
            <span className={cn("tracking-[0.2em] text-muted/50 uppercase -mt-0.5", s.tag)}>
              Exclusive Listening
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function KevalLogoMark({ size = 10, className }: { size?: number; className?: string }) {
  const px = size * 4;

  return (
    <div className={cn("relative", className)} style={{ width: px, height: px }}>
      <Image
        src="/logo/keval-logo.png"
        alt="Keval Sound"
        width={px}
        height={px}
        className="object-contain"
      />
    </div>
  );
}
