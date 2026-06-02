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
  return tag
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/\br and b\b/g, "r&b")
    .replace(/\blo fi\b/g, "lo-fi")
    .replace(/\bhip hop\b/g, "hip-hop")
    .replace(/\bk pop\b/g, "k-pop")
    .replace(/\bj pop\b/g, "j-pop")
    .replace(/\bc pop\b/g, "c-pop")
    .replace(/\bedm\b/g, "EDM");
}

function isTempoTag(tag: string) {
  return /\bbpm\b/.test(tag);
}

const LOW_SIGNAL_TAGS = new Set([
  "bollywood",
  "classic",
  "commercial",
  "culture",
  "electronic",
  "hip",
  "indie",
  "mixed",
  "occasion",
]);

const ALLOWED_SHORT_TAGS = new Set([
  "dub",
  "EDM",
  "pop",
  "rap",
  "r&b",
  "rock",
]);

function canonicalTag(tag: string) {
  return tag
    .replace(/&/g, "and")
    .replace(/\br and b\b/g, "rnb")
    .replace(/\brnb\b/g, "rnb")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function isLowSignalTag(tag: string) {
  if (LOW_SIGNAL_TAGS.has(tag)) return true;
  return tag.length < 4 && !ALLOWED_SHORT_TAGS.has(tag);
}

function removeWeakerDuplicates(tags: string[]) {
  return tags.filter((tag) => {
    const canonical = canonicalTag(tag);
    if (!canonical) return false;

    return !tags.some((other) => {
      if (other === tag) return false;
      const otherCanonical = canonicalTag(other);
      return otherCanonical.length > canonical.length && otherCanonical.includes(canonical);
    });
  });
}

export function getTrackDisplayTags(track: TrackTagSource, limit = 2) {
  const candidates = [
    ...(track.tags ?? []),
    track.genre,
    track.mood,
  ]
    .map(normalizeDisplayTag)
    .filter((tag) => Boolean(tag) && !isTempoTag(tag) && !isLowSignalTag(tag));

  return removeWeakerDuplicates(Array.from(new Set(candidates))).slice(0, Math.max(limit, 0));
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
