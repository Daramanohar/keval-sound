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

function compactDisplayTag(tag: string) {
  const preferred: Array<[RegExp, string]> = [
    [/contemporary r&b/, "contemporary r&b"],
    [/neo soul/, "neo soul"],
    [/lo-fi hip-hop/, "lo-fi hip-hop"],
    [/trap anthem/, "trap anthem"],
    [/trap swing/, "trap swing"],
    [/rap anthem/, "rap anthem"],
    [/lyrical rap/, "lyrical rap"],
    [/west coast bounce/, "west coast bounce"],
    [/west coast swing/, "west coast swing"],
    [/conscious rap/, "conscious rap"],
    [/modern hip-hop/, "modern hip-hop"],
    [/(hip-hop.*rap|rap.*hip-hop)/, "hip-hop / rap"],
    [/syncopated hi hats?/, "syncopated hi hats"],
    [/swung hi hats?/, "swung hi hats"],
    [/jazzy chord stabs?/, "jazzy chord stabs"],
    [/swung drums?/, "swung drums"],
    [/upright bass warmth/, "upright bass warmth"],
    [/warm bass(?:line|lines)?(?: glide)?/, "warm bass"],
    [/(?:chopped|dusty|soulful) soul samples?/, "soul samples"],
    [/soulful chopped samples?/, "soul samples"],
    [/jazz piano stabs?/, "jazz piano"],
    [/sliding sub hits?|sub drops?/, "sub bass"],
    [/(?:punchy|cinematic|swung) snares?|crisp clap snaps?|dry snare crack/, "punchy drums"],
    [/pop rock anthem/, "pop rock"],
    [/crunchy guitar riff/, "guitar riff"],
    [/electronic dance/, "electronic dance"],
    [/smooth jazz/, "smooth jazz"],
    [/swung jazz/, "swung jazz"],
    [/(?:retro|stomping|nocturnal) groove/, "groove"],
    [/spoken word/, "spoken word"],
    [/dusty jazz touches?/, "dusty jazz"],
    [/dynamic flow switches?/, "dynamic flow"],
    [/tense .*bounce/, "tense bounce"],
  ];

  for (const [pattern, replacement] of preferred) {
    if (pattern.test(tag)) return replacement;
  }

  const cleanedTag = tag
    .replace(/^(?:and|then|final|but)\s+/, "")
    .replace(/^a\s+/, "")
    .replace(/\b(?:driven|pockets|throws|responses|transitions|turns|lines|flourishes|crackle|swells|ticks)\b/g, "")
    .replace(/\b(?:close mic|selective|occasional|doubled|bright yet|wide|intimate|radio ready)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const phrase = cleanedTag
    .split(/\b(?:with|over|featuring|built around|built on|driven by|verse|verses|pre chorus|chorus|bridge|add|then|but|and)\b/)[0]
    .replace(/\b(?:mix|lead|vocal|ad libs?|drop|half|thin)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = phrase.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.some((word) => ["and", "but", "then", "final", "rapid"].includes(word))) return "";
  if (words.length === 1 && words[0].length < 4) return "";

  return words.slice(0, 3).join(" ");
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
  if (/^(?:and|then|final|but)\b/.test(tag)) return true;
  if (/\b(?:with|featuring|built|driven|rapid|fire|tempo|verses?|choruses?|pockets|throws|responses|transitions|switches|punchlines|stays|replies|on the|pre choruses|lead vocal|ear candy|delay|turntable|vinyl|metallic|brief|claps|shouted|reversed|glitch fills|double tracked|pre strips|breakdown drops|organic percussion|tiny vinyl)\b/.test(tag)) return true;
  if (/\b(?:on|to|into|includes?|mark|marks)$/.test(tag)) return true;
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
    .map(compactDisplayTag)
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
      {tags.map((tag, index) => (
        <span
          key={tag}
          className={cn(
            "max-w-full truncate",
            index === 0 && "text-zesty-red/85",
            index === 1 && "text-dandelion/90",
            itemClassName
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
