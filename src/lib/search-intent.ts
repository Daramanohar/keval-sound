const STOP_PHRASES = [
  "i need",
  "i want",
  "find me",
  "give me",
  "looking for",
  "some type of",
  "this type of",
];

const INTENT_EXPANSIONS: Array<{
  pattern: RegExp;
  terms: string[];
}> = [
  {
    pattern: /\b(movie|film|short film|cinema|scene|trailer|teaser|documentary)\b/i,
    terms: ["cinematic", "soundtrack", "film score", "dramatic", "visual storytelling"],
  },
  {
    pattern: /\b(reel|short|youtube|instagram|content|creator|vlog|video|clip)\b/i,
    terms: ["creator background", "commercial use", "clean edit", "engaging intro"],
  },
  {
    pattern: /\b(wedding|marriage|bride|groom|pre wedding|venue|celebration)\b/i,
    terms: ["romantic", "celebratory", "elegant", "emotional", "uplifting"],
  },
  {
    pattern: /\b(workout|gym|fitness|training|sports|run|running|transformation)\b/i,
    terms: ["energetic", "driving", "powerful", "motivational", "high impact"],
  },
  {
    pattern: /\b(study|focus|coding|work|productivity|deep work|coffee)\b/i,
    terms: ["lo-fi", "calm", "soft piano", "ambient", "focused background"],
  },
  {
    pattern: /\b(meditation|yoga|sleep|calm|relax|peaceful|healing)\b/i,
    terms: ["ambient", "soft", "peaceful", "warm pads", "minimal percussion"],
  },
  {
    pattern: /\b(luxury|premium|fashion|brand|corporate|startup|product demo)\b/i,
    terms: ["premium", "polished", "modern", "smooth", "commercial"],
  },
  {
    pattern: /\b(dance|party|club|festival|dj|edm)\b/i,
    terms: ["dance", "club", "festival", "energetic", "rhythmic"],
  },
  {
    pattern: /\b(dark|crime|horror|thriller|suspense|tension|mystery)\b/i,
    terms: ["dark", "tense", "suspenseful", "dramatic", "cinematic"],
  },
  {
    pattern: /\b(indian|desi|bollywood|hindi|punjabi|bhangra)\b/i,
    terms: ["Indian", "Bollywood", "desi", "regional texture", "rhythmic percussion"],
  },
];

const DIRECT_OPTIMIZATIONS: Array<[RegExp, string]> = [
  [
    /\bsad song\b/i,
    "Melancholic emotional song with acoustic piano, warm guitar, minor mood, intimate cinematic feeling",
  ],
  [
    /\bparty music\b/i,
    "High-energy dance music with strong rhythm, celebratory mood, club-ready percussion, bright hook",
  ],
  [
    /\bchill beats?\b/i,
    "Lo-fi chill beat with soft piano, warm texture, relaxed groove, study background mood",
  ],
  [
    /\bworkout\b/i,
    "Aggressive energetic workout track with heavy drums, driving bass, motivational build, high impact",
  ],
  [
    /\bwedding\b/i,
    "Elegant romantic wedding music with emotional cinematic build, celebratory energy, warm Indian textures",
  ],
];

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function optimizeSearchPrompt(query: string) {
  const cleanQuery = compactWhitespace(query);
  if (!cleanQuery) return "";

  const direct = DIRECT_OPTIMIZATIONS.find(([pattern]) => pattern.test(cleanQuery));
  if (direct) return direct[1];

  const lower = cleanQuery.toLowerCase();
  const normalizedQuery = STOP_PHRASES.reduce(
    (current, phrase) => current.replaceAll(phrase, " "),
    lower
  );
  const terms = new Set<string>();

  for (const expansion of INTENT_EXPANSIONS) {
    if (expansion.pattern.test(cleanQuery)) {
      expansion.terms.forEach((term) => terms.add(term));
    }
  }

  const basePrompt = compactWhitespace(normalizedQuery) || cleanQuery;
  const enrichedTerms = Array.from(terms);

  if (!enrichedTerms.length && cleanQuery.split(/\s+/).length > 5) {
    return cleanQuery;
  }

  if (!enrichedTerms.length) {
    return `${cleanQuery}, clear mood, genre, instrumentation, usage context, production-ready music`;
  }

  return `${basePrompt}, ${enrichedTerms.join(", ")}`;
}

export function createSearchAcknowledgement(query: string, total: number, vectorReady: boolean) {
  const cleanQuery = compactWhitespace(query);

  if (!cleanQuery) {
    return total > 0
      ? "Here is a mixed discovery shelf from the full Keval catalog. Pick any track to preview."
      : "Start with a mood, genre, scene, or video idea and Keval will search the catalog for you.";
  }

  if (total === 0) {
    return "I could not find a close match yet. Try describing the scene, mood, genre, or instrument in a different way.";
  }

  return vectorReady
    ? `Yes, I found ${total} close matches for your idea. Listen through the list and pick the one that fits your scene.`
    : `Yes, I found ${total} metadata matches for your idea. Listen through the list and pick the one that fits your scene.`;
}
