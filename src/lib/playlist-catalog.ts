export const CURATED_PLAYLISTS = [
  {
    slug: "acoustic",
    title: "Acoustic",
    tag: "Acoustic",
    description: "Organic guitar-led warmth for lifestyle films, intimate edits, and human stories.",
    coverUrl: "/playlists/acoustic.webp",
  },
  {
    slug: "ambient",
    title: "Ambient",
    tag: "Ambient",
    description: "Atmospheric beds for calm scenes, premium visuals, and reflective creator work.",
    coverUrl: "/playlists/ambient.webp",
  },
  {
    slug: "bollywood",
    title: "Bollywood",
    tag: "Bollywood",
    description: "Desi-flavoured hooks, rhythms, and cinematic cues built for vibrant moments.",
    coverUrl: "/playlists/bollywood.webp",
  },
  {
    slug: "cinematic",
    title: "Cinematic",
    tag: "Cinematic",
    description: "Scene-ready cues for edits, trailers, shorts, and visual storytelling.",
    coverUrl: "/playlists/cinematic.webp",
  },
  {
    slug: "dance",
    title: "Dance",
    tag: "Dance",
    description: "High-energy movement tracks for reels, events, fashion edits, and celebrations.",
    coverUrl: "/playlists/dance.webp",
  },
  {
    slug: "downtempo",
    title: "Downtempo",
    tag: "Downtempo",
    description: "Laid-back grooves and slow-burn textures for soft cuts and understated scenes.",
    coverUrl: "/playlists/downtempo.webp",
  },
  {
    slug: "electronic",
    title: "Electronic",
    tag: "Electronic",
    description: "Forward-driving electronic picks for modern creator cuts and digital visuals.",
    coverUrl: "/playlists/electronic.webp",
  },
  {
    slug: "experimental",
    title: "Experimental",
    tag: "Experimental",
    description: "Unusual textures, left-field rhythms, and bold ideas for distinctive edits.",
    coverUrl: "/playlists/experimental.webp",
  },
  {
    slug: "house",
    title: "House",
    tag: "House",
    description: "Clean club pulse and polished grooves for fashion, nightlife, and motion work.",
    coverUrl: "/playlists/house.webp",
  },
  {
    slug: "lo-fi",
    title: "Lo-Fi",
    tag: "Lo-Fi",
    description: "Warm, low-pressure beats for study, flow, and soft vlogs.",
    coverUrl: "/playlists/lofi.webp",
  },
  {
    slug: "orchestral",
    title: "Orchestral",
    tag: "Orchestral",
    description: "Rich score cues for emotional builds, grand reveals, and dramatic storytelling.",
    coverUrl: "/playlists/orchestral.webp",
  },
  {
    slug: "rock",
    title: "Rock",
    tag: "Rock",
    description: "Guitar-led selections for action, attitude, momentum, and bold creator frames.",
    coverUrl: "/playlists/rock.webp",
  },
  {
    slug: "workout",
    title: "Workout",
    tag: "Workout",
    description: "Punchy, active tracks for sports edits, training clips, and energetic pacing.",
    coverUrl: "/playlists/workout.webp",
  },
] as const;

export type CuratedPlaylistDefinition = (typeof CURATED_PLAYLISTS)[number];

export function getCuratedPlaylistBySlug(slug: string) {
  return CURATED_PLAYLISTS.find((playlist) => playlist.slug === slug) ?? null;
}
