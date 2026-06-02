import { cn } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";

type TrackTagSource = Pick<Track, "tags" | "genre" | "mood">;

interface TrackTagLineProps {
  track: TrackTagSource;
  limit?: number;
  className?: string;
  itemClassName?: string;
}

function normalizeDisplayTag(tag: string) {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

export function getTrackDisplayTags(track: TrackTagSource, limit = 2) {
  const candidates = [
    ...(track.tags ?? []),
    track.genre,
    track.mood,
  ]
    .map(normalizeDisplayTag)
    .filter(Boolean);

  return Array.from(new Set(candidates)).slice(0, Math.max(limit, 0));
}

export default function TrackTagLine({
  track,
  limit = 2,
  className,
  itemClassName,
}: TrackTagLineProps) {
  const tags = getTrackDisplayTags(track, limit);

  if (!tags.length) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 text-[10px] leading-snug text-muted/55",
        className
      )}
    >
      {tags.map((tag) => (
        <span key={tag} className={cn("max-w-full truncate", itemClassName)}>
          {tag}
        </span>
      ))}
    </div>
  );
}
