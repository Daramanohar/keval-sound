"use client";

import Image from "next/image";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlayerArtwork({
  src,
  title,
  className,
  sizes = "80px",
  priority = false,
}: {
  src?: string;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const isLocalImage = src?.startsWith("/");
  const isRemoteImage = src?.startsWith("http");

  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-white/[0.05]", className)}>
      <div className={cn("absolute inset-0 flex items-center justify-center", src && !isLocalImage && !isRemoteImage && `bg-gradient-to-br ${src}`)}>
        <Music2 className="h-1/3 w-1/3 text-white/55" aria-hidden="true" />
      </div>
      {isLocalImage ? (
        <Image src={src!} alt={`${title} artwork`} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : isRemoteImage ? (
        <div
          role="img"
          aria-label={`${title} artwork`}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${src}")` }}
        />
      ) : null}
    </div>
  );
}
