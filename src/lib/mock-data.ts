export interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl?: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  duration: number; // seconds
  price: number;
  coverUrl: string;
  waveform: number[];
  tags: string[];
  isExclusive: boolean;
  isTrending: boolean;
  isSellingFast: boolean;
  region: string;
  language: string;
  stems: boolean;
  plays: number;
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  trackCount: number;
  totalDuration: number;
  price: number;
  originalPrice: number;
  genre: string;
  mood: string;
  tracks: Track[];
  tags: string[];
  featured: boolean;
}

export interface Sample {
  id: string;
  name: string;
  audioUrl?: string;
  type: "loop" | "one-shot" | "stem" | "sfx";
  bpm: number;
  key: string;
  duration: number;
  format: string;
  size: string;
  genre: string;
  instrument: string;
  tags: string[];
  price: number;
  waveform: number[];
}

export interface CartItem {
  id: string;
  type: "track" | "pack" | "sample";
  title: string;
  artist?: string;
  price: number;
  coverUrl: string;
  license: "standard" | "premium" | "exclusive";
}

function createWaveformSeed(label: string): number {
  return Array.from(label).reduce((seed, character) => seed + character.charCodeAt(0), 97);
}

function generateWaveform(label: string): number[] {
  let seed = createWaveformSeed(label);

  return Array.from({ length: 50 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const normalized = seed / 4294967296;
    const contour = Math.sin((index / 49) * Math.PI) * 0.18;

    return Number((0.22 + normalized * 0.58 + contour).toFixed(3));
  });
}

const coverColors = [
  "from-mid-purple to-grey-magenta",
  "from-vivid-blue to-mid-purple",
  "from-grey-magenta to-zesty-red",
  "from-grey-azure to-vivid-blue",
  "from-zesty-red to-dandelion",
  "from-mud-brown to-grey-magenta",
  "from-mid-purple to-vivid-blue",
  "from-grey-magenta to-mid-purple",
];

export const tracks: Track[] = [
  {
    id: "t1",
    title: "Mumbai Nights",
    artist: "Arjun Beats",
    genre: "Bollywood Trap",
    mood: "Energetic",
    bpm: 140,
    key: "Am",
    duration: 214,
    price: 4999,
    coverUrl: coverColors[0],
    waveform: generateWaveform("t1"),
    tags: ["trap", "bollywood", "bass", "urban"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: true,
    region: "Maharashtra",
    language: "Hindi",
    stems: true,
    plays: 12400,
  },
  {
    id: "t2",
    title: "Rajasthani Sunset",
    artist: "Desert Sounds",
    genre: "Folk Fusion",
    mood: "Melancholic",
    bpm: 95,
    key: "Dm",
    duration: 186,
    price: 2999,
    coverUrl: coverColors[1],
    waveform: generateWaveform("t2"),
    tags: ["folk", "rajasthani", "fusion", "ambient"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: false,
    region: "Rajasthan",
    language: "Rajasthani",
    stems: true,
    plays: 8700,
  },
  {
    id: "t3",
    title: "Chennai Bass",
    artist: "Tamil Wave",
    genre: "South Indian EDM",
    mood: "Hype",
    bpm: 128,
    key: "Cm",
    duration: 198,
    price: 3499,
    coverUrl: coverColors[2],
    waveform: generateWaveform("t3"),
    tags: ["edm", "tamil", "bass", "dance"],
    isExclusive: true,
    isTrending: false,
    isSellingFast: true,
    region: "Tamil Nadu",
    language: "Tamil",
    stems: false,
    plays: 6300,
  },
  {
    id: "t4",
    title: "Punjab Groove",
    artist: "Sidhu Productions",
    genre: "Bhangra Pop",
    mood: "Happy",
    bpm: 110,
    key: "G",
    duration: 227,
    price: 5999,
    coverUrl: coverColors[3],
    waveform: generateWaveform("t4"),
    tags: ["bhangra", "pop", "punjabi", "dance"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: true,
    region: "Punjab",
    language: "Punjabi",
    stems: true,
    plays: 18900,
  },
  {
    id: "t5",
    title: "Goa Trance Dreams",
    artist: "Psybaba",
    genre: "Psytrance",
    mood: "Euphoric",
    bpm: 145,
    key: "Em",
    duration: 312,
    price: 3999,
    coverUrl: coverColors[4],
    waveform: generateWaveform("t5"),
    tags: ["psytrance", "goa", "electronic", "trippy"],
    isExclusive: true,
    isTrending: false,
    isSellingFast: false,
    region: "Goa",
    language: "Instrumental",
    stems: true,
    plays: 4200,
  },
  {
    id: "t6",
    title: "Bengali Rain",
    artist: "Kolkata Collective",
    genre: "Lo-fi Bengali",
    mood: "Chill",
    bpm: 82,
    key: "F",
    duration: 243,
    price: 1999,
    coverUrl: coverColors[5],
    waveform: generateWaveform("t6"),
    tags: ["lofi", "bengali", "chill", "rain"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: false,
    region: "West Bengal",
    language: "Bengali",
    stems: false,
    plays: 9100,
  },
  {
    id: "t7",
    title: "Hyderabad Drill",
    artist: "Deccan Beats",
    genre: "Desi Drill",
    mood: "Dark",
    bpm: 142,
    key: "Bbm",
    duration: 176,
    price: 4499,
    coverUrl: coverColors[6],
    waveform: generateWaveform("t7"),
    tags: ["drill", "telugu", "dark", "hard"],
    isExclusive: true,
    isTrending: false,
    isSellingFast: true,
    region: "Telangana",
    language: "Telugu",
    stems: true,
    plays: 5600,
  },
  {
    id: "t8",
    title: "Kerala Waves",
    artist: "Malabar Sound",
    genre: "Tropical House",
    mood: "Relaxed",
    bpm: 118,
    key: "C",
    duration: 205,
    price: 2499,
    coverUrl: coverColors[7],
    waveform: generateWaveform("t8"),
    tags: ["tropical", "house", "malayalam", "chill"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: false,
    region: "Kerala",
    language: "Malayalam",
    stems: false,
    plays: 7800,
  },
  {
    id: "t9",
    title: "Delhi Streets",
    artist: "Capital Crew",
    genre: "Indian Hip Hop",
    mood: "Aggressive",
    bpm: 90,
    key: "Gm",
    duration: 192,
    price: 6999,
    coverUrl: coverColors[0],
    waveform: generateWaveform("t9"),
    tags: ["hiphop", "rap", "delhi", "street"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: true,
    region: "Delhi",
    language: "Hindi",
    stems: true,
    plays: 22300,
  },
  {
    id: "t10",
    title: "Assamese Dreams",
    artist: "Northeast Vibes",
    genre: "Ambient Folk",
    mood: "Dreamy",
    bpm: 75,
    key: "D",
    duration: 268,
    price: 1499,
    coverUrl: coverColors[1],
    waveform: generateWaveform("t10"),
    tags: ["ambient", "folk", "assamese", "nature"],
    isExclusive: true,
    isTrending: false,
    isSellingFast: false,
    region: "Assam",
    language: "Assamese",
    stems: false,
    plays: 3200,
  },
  {
    id: "t11",
    title: "Marathi Thunder",
    artist: "Pune Bass Co.",
    genre: "Drum & Bass",
    mood: "Intense",
    bpm: 174,
    key: "Fm",
    duration: 245,
    price: 3999,
    coverUrl: coverColors[2],
    waveform: generateWaveform("t11"),
    tags: ["dnb", "marathi", "bass", "intense"],
    isExclusive: true,
    isTrending: false,
    isSellingFast: false,
    region: "Maharashtra",
    language: "Marathi",
    stems: true,
    plays: 4100,
  },
  {
    id: "t12",
    title: "Gujarati Garba Drop",
    artist: "Navratri Nights",
    genre: "Garba EDM",
    mood: "Festive",
    bpm: 135,
    key: "A",
    duration: 199,
    price: 4499,
    coverUrl: coverColors[3],
    waveform: generateWaveform("t12"),
    tags: ["garba", "edm", "gujarati", "festive"],
    isExclusive: true,
    isTrending: true,
    isSellingFast: true,
    region: "Gujarat",
    language: "Gujarati",
    stems: true,
    plays: 15600,
  },
];

function expandPackTracks(packId: string, count: number): Track[] {
  return Array.from({ length: count }, (_, i) => {
    const base = tracks[i % tracks.length];
    return {
      ...base,
      id: `${packId}-t${i + 1}`,
      title: i < tracks.length
        ? base.title
        : `${base.title} (Alt Mix ${Math.floor(i / tracks.length)})`,
    };
  });
}

export const packs: Pack[] = [
  {
    id: "p1",
    title: "Bollywood Essentials Vol. 1",
    description: "25 premium Bollywood-inspired tracks spanning romance, drama, and dance. Perfect for film scoring and content creation.",
    coverUrl: coverColors[0],
    trackCount: 25,
    totalDuration: 4800,
    price: 24999,
    originalPrice: 49999,
    genre: "Bollywood",
    mood: "Mixed",
    tracks: expandPackTracks("p1", 25),
    tags: ["bollywood", "film", "scoring", "premium"],
    featured: true,
  },
  {
    id: "p2",
    title: "South Indian Beats Collection",
    description: "30 tracks featuring Tamil, Telugu, Kannada and Malayalam beats. From classical Carnatic fusions to modern South Indian pop.",
    coverUrl: coverColors[2],
    trackCount: 30,
    totalDuration: 5400,
    price: 29999,
    originalPrice: 59999,
    genre: "South Indian",
    mood: "Energetic",
    tracks: expandPackTracks("p2", 25),
    tags: ["south-indian", "carnatic", "fusion", "pop"],
    featured: true,
  },
  {
    id: "p3",
    title: "Lo-fi Indian Nights",
    description: "20 chill lo-fi tracks infused with Indian instruments - sitar, tabla, bansuri over laid-back beats. Study & relax vibes.",
    coverUrl: coverColors[5],
    trackCount: 20,
    totalDuration: 3600,
    price: 14999,
    originalPrice: 29999,
    genre: "Lo-fi",
    mood: "Chill",
    tracks: expandPackTracks("p3", 25),
    tags: ["lofi", "chill", "study", "ambient"],
    featured: false,
  },
  {
    id: "p4",
    title: "Desi Hip Hop Starter Kit",
    description: "28 hard-hitting hip hop beats inspired by Indian street culture. From Delhi gully rap to Mumbai underground.",
    coverUrl: coverColors[6],
    trackCount: 28,
    totalDuration: 5100,
    price: 34999,
    originalPrice: 69999,
    genre: "Hip Hop",
    mood: "Aggressive",
    tracks: expandPackTracks("p4", 25),
    tags: ["hiphop", "rap", "desi", "street"],
    featured: true,
  },
  {
    id: "p5",
    title: "Folk Fusion Masters",
    description: "25 tracks blending traditional Indian folk music with modern production. Rajasthani, Punjabi, Bengali and more.",
    coverUrl: coverColors[1],
    trackCount: 25,
    totalDuration: 4500,
    price: 19999,
    originalPrice: 39999,
    genre: "Folk Fusion",
    mood: "Cultural",
    tracks: expandPackTracks("p5", 25),
    tags: ["folk", "fusion", "traditional", "modern"],
    featured: false,
  },
  {
    id: "p6",
    title: "Electronic India",
    description: "30 electronic productions merging psytrance, house and techno with Indian classical elements.",
    coverUrl: coverColors[4],
    trackCount: 30,
    totalDuration: 6200,
    price: 27999,
    originalPrice: 54999,
    genre: "Electronic",
    mood: "Euphoric",
    tracks: expandPackTracks("p6", 25),
    tags: ["electronic", "trance", "house", "techno"],
    featured: true,
  },
  {
    id: "p7",
    title: "Rajasthani Folk Revival",
    description: "Authentic Rajasthani folk tracks blending sarangi, dholak, and Manganiyar vocals for film and brand storytelling.",
    coverUrl: "from-orange-600 to-amber-500",
    trackCount: 25,
    totalDuration: 4600,
    price: 19999,
    originalPrice: 34999,
    genre: "Folk Fusion",
    mood: "Earthy",
    tracks: expandPackTracks("p7", 25),
    tags: ["rajasthani", "folk", "sarangi", "dholak", "manganiyar"],
    featured: false,
  },
  {
    id: "p8",
    title: "Kerala Waves",
    description: "Tracks rooted in Kerala's classical and contemporary soundscape — Sopana, fusion jazz, and Mollywood drama scores.",
    coverUrl: "from-teal-700 to-cyan-500",
    trackCount: 25,
    totalDuration: 4700,
    price: 22999,
    originalPrice: 39999,
    genre: "Classical Fusion",
    mood: "Serene",
    tracks: expandPackTracks("p8", 25),
    tags: ["kerala", "sopana", "mollywood", "classical", "fusion"],
    featured: false,
  },
  {
    id: "p9",
    title: "Punjabi Dhol Power",
    description: "High-energy Punjabi tracks built around dhol, tumbi, and bhangra pop rhythms for weddings, reels, and stage.",
    coverUrl: "from-yellow-500 to-orange-500",
    trackCount: 25,
    totalDuration: 5100,
    price: 26999,
    originalPrice: 44999,
    genre: "Bhangra",
    mood: "Energetic",
    tracks: expandPackTracks("p9", 25),
    tags: ["punjabi", "bhangra", "dhol", "wedding", "tumbi"],
    featured: false,
  },
  {
    id: "p10",
    title: "Bengali Monsoon Stories",
    description: "Spanning Rabindra Sangeet influences, Baul folk, and Lo-fi Bengali ambient for cinematic and lyrical use.",
    coverUrl: "from-blue-800 to-indigo-600",
    trackCount: 25,
    totalDuration: 4200,
    price: 21499,
    originalPrice: 37999,
    genre: "Lo-fi",
    mood: "Melancholic",
    tracks: expandPackTracks("p10", 25),
    tags: ["bengali", "baul", "rabindra", "lofi", "monsoon"],
    featured: false,
  },
  {
    id: "p11",
    title: "Tamil Cinematic Gold",
    description: "Tracks drawing from AR Rahman-era orchestration, Kollywood percussion, and Carnatic raga blends for premium sync.",
    coverUrl: "from-rose-700 to-pink-500",
    trackCount: 25,
    totalDuration: 5800,
    price: 29999,
    originalPrice: 49999,
    genre: "South Indian",
    mood: "Epic",
    tracks: expandPackTracks("p11", 25),
    tags: ["tamil", "kollywood", "carnatic", "cinematic", "orchestra"],
    featured: false,
  },
  {
    id: "p12",
    title: "Marathi Lavani Luxe",
    description: "Marathi Lavani and Powada traditions reimagined for modern content with full stems and production-ready mixes.",
    coverUrl: "from-purple-700 to-violet-500",
    trackCount: 25,
    totalDuration: 3400,
    price: 17999,
    originalPrice: 31999,
    genre: "Folk Fusion",
    mood: "Playful",
    tracks: expandPackTracks("p12", 25),
    tags: ["marathi", "lavani", "powada", "folk", "stems"],
    featured: false,
  },
];

export const samples: Sample[] = [
  { id: "s1", name: "Tabla Loop - Fast Teentaal", type: "loop", bpm: 160, key: "-", duration: 8, format: "WAV", size: "2.4 MB", genre: "Classical", instrument: "Tabla", tags: ["tabla", "teentaal", "fast"], price: 299, waveform: generateWaveform("s1") },
  { id: "s2", name: "Sitar Riff - Raag Yaman", type: "one-shot", bpm: 0, key: "C", duration: 4, format: "WAV", size: "1.1 MB", genre: "Classical", instrument: "Sitar", tags: ["sitar", "raag", "yaman"], price: 199, waveform: generateWaveform("s2") },
  { id: "s3", name: "Dhol Loop - Bhangra Pattern", type: "loop", bpm: 110, key: "-", duration: 4, format: "WAV", size: "1.8 MB", genre: "Bhangra", instrument: "Dhol", tags: ["dhol", "bhangra", "punjabi"], price: 349, waveform: generateWaveform("s3") },
  { id: "s4", name: "Bansuri Melody - Pentatonic", type: "one-shot", bpm: 0, key: "G", duration: 6, format: "WAV", size: "1.6 MB", genre: "Folk", instrument: "Bansuri", tags: ["bansuri", "flute", "melody"], price: 249, waveform: generateWaveform("s4") },
  { id: "s5", name: "808 Bass - Desi Drill", type: "one-shot", bpm: 0, key: "F", duration: 2, format: "WAV", size: "0.8 MB", genre: "Hip Hop", instrument: "Synth Bass", tags: ["808", "bass", "drill"], price: 149, waveform: generateWaveform("s5") },
  { id: "s6", name: "Harmonium Chord Pad", type: "loop", bpm: 90, key: "Am", duration: 8, format: "WAV", size: "2.8 MB", genre: "Devotional", instrument: "Harmonium", tags: ["harmonium", "pad", "ambient"], price: 299, waveform: generateWaveform("s6") },
  { id: "s7", name: "Mridangam Pattern - Adi Taal", type: "loop", bpm: 120, key: "-", duration: 4, format: "WAV", size: "1.5 MB", genre: "Carnatic", instrument: "Mridangam", tags: ["mridangam", "carnatic", "rhythm"], price: 349, waveform: generateWaveform("s7") },
  { id: "s8", name: "Veena Pluck - Raag Bhairavi", type: "one-shot", bpm: 0, key: "D", duration: 3, format: "WAV", size: "0.9 MB", genre: "Classical", instrument: "Veena", tags: ["veena", "bhairavi", "pluck"], price: 199, waveform: generateWaveform("s8") },
  { id: "s9", name: "Tanpura Drone - Sa", type: "loop", bpm: 0, key: "C", duration: 30, format: "WAV", size: "8.2 MB", genre: "Classical", instrument: "Tanpura", tags: ["tanpura", "drone", "ambient"], price: 199, waveform: generateWaveform("s9") },
  { id: "s10", name: "Dholak Groove - Bollywood", type: "loop", bpm: 105, key: "-", duration: 4, format: "WAV", size: "1.4 MB", genre: "Bollywood", instrument: "Dholak", tags: ["dholak", "bollywood", "groove"], price: 299, waveform: generateWaveform("s10") },
  { id: "s11", name: "Sarangi Lead Line", type: "one-shot", bpm: 0, key: "Bb", duration: 5, format: "WAV", size: "1.3 MB", genre: "Folk", instrument: "Sarangi", tags: ["sarangi", "lead", "emotional"], price: 349, waveform: generateWaveform("s11") },
  { id: "s12", name: "Shehnai Fanfare", type: "one-shot", bpm: 0, key: "D", duration: 7, format: "WAV", size: "2.0 MB", genre: "Wedding", instrument: "Shehnai", tags: ["shehnai", "wedding", "fanfare"], price: 249, waveform: generateWaveform("s12") },
  { id: "s13", name: "Vocal Chop - Female Hindi", type: "one-shot", bpm: 128, key: "Cm", duration: 1, format: "WAV", size: "0.4 MB", genre: "Pop", instrument: "Vocal", tags: ["vocal", "chop", "hindi"], price: 399, waveform: generateWaveform("s13") },
  { id: "s14", name: "Kick Drum - Bollywood Heavy", type: "one-shot", bpm: 0, key: "-", duration: 1, format: "WAV", size: "0.2 MB", genre: "Bollywood", instrument: "Drums", tags: ["kick", "drum", "heavy"], price: 99, waveform: generateWaveform("s14") },
  { id: "s15", name: "Clap Stack - Desi Club", type: "one-shot", bpm: 0, key: "-", duration: 1, format: "WAV", size: "0.1 MB", genre: "Club", instrument: "Drums", tags: ["clap", "club", "stack"], price: 99, waveform: generateWaveform("s15") },
  { id: "s16", name: "FX Riser - Bollywood Drop", type: "sfx", bpm: 0, key: "-", duration: 4, format: "WAV", size: "1.2 MB", genre: "Bollywood", instrument: "SFX", tags: ["riser", "fx", "drop"], price: 149, waveform: generateWaveform("s16") },
];

export const genres = [
  "All Genres", "Bollywood", "Hip Hop", "EDM", "Folk Fusion", "Classical",
  "Bhangra", "Lo-fi", "Psytrance", "Carnatic", "Drill", "Trap",
  "R&B", "Pop", "Rock", "Ambient", "Devotional",
];

export const moods = [
  "All Moods", "Energetic", "Chill", "Dark", "Happy", "Melancholic",
  "Hype", "Euphoric", "Aggressive", "Dreamy", "Festive", "Romantic",
  "Intense", "Relaxed", "Spiritual",
];

export const regions = [
  "All Regions", "Maharashtra", "Punjab", "Tamil Nadu", "Rajasthan",
  "West Bengal", "Kerala", "Telangana", "Delhi", "Goa", "Gujarat",
  "Assam", "Karnataka",
];

export const keys = [
  "All Keys", "C", "Cm", "D", "Dm", "E", "Em", "F", "Fm",
  "G", "Gm", "A", "Am", "Bb", "Bbm",
];

export const bpmRanges = [
  { label: "All BPM", min: 0, max: 300 },
  { label: "60-90 (Slow)", min: 60, max: 90 },
  { label: "90-120 (Medium)", min: 90, max: 120 },
  { label: "120-140 (Fast)", min: 120, max: 140 },
  { label: "140+ (Very Fast)", min: 140, max: 300 },
];
