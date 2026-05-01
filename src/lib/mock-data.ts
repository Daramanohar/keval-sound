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
  category: string;
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

// ─── 64 Real Sound Packs ──────────────────────────────────────────────────────
// Sequential order matches album art filenames in /public/packs/pack-{N}.png
// Song counts and categories sourced from Sound PACKS LIST.pdf

interface PackDef {
  n: number;
  title: string;
  category: string;
  count: number;
  price: number;
  origPrice: number;
  desc: string;
  tags: string[];
  featured: boolean;
}

const packDefs: PackDef[] = [
  { n: 1,  title: "Pop",                        category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 chart-ready Pop tracks built for sync, ads, and content creation.", tags: ["pop", "commercial", "catchy", "upbeat"], featured: true },
  { n: 2,  title: "Hip-Hop / Rap",              category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 hard-hitting Hip-Hop and Rap beats spanning trap, boom-bap, and drill.", tags: ["hiphop", "rap", "trap", "beats"], featured: false },
  { n: 3,  title: "R&B",                        category: "Commercial", count: 25, price: 7499,  origPrice: 12999, desc: "25 smooth R&B grooves with rich harmonies and soulful production.", tags: ["rnb", "soul", "smooth", "groove"], featured: false },
  { n: 4,  title: "Rock",                       category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 guitar-driven Rock tracks from anthemic choruses to gritty riffs.", tags: ["rock", "guitar", "anthemic", "band"], featured: false },
  { n: 5,  title: "Latin",                      category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Latin tracks spanning reggaeton, salsa, and Afrobeats-influenced sounds.", tags: ["latin", "salsa", "dance"], featured: false },
  { n: 6,  title: "Country",                    category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Country tracks with twangy guitars, steel pedal, and heartfelt storytelling.", tags: ["country", "guitar", "americana"], featured: false },
  { n: 7,  title: "EDM / Dance",                category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 floor-filling EDM and Dance tracks engineered for festivals and clubs.", tags: ["edm", "dance", "festival", "club"], featured: true },
  { n: 8,  title: "K-Pop",                      category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 polished K-Pop productions with punchy hooks and synchronized energy.", tags: ["kpop", "korean", "dance", "pop"], featured: false },
  { n: 9,  title: "Reggaeton",                  category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Reggaeton tracks with dembow rhythms, perreo energy, and urban flair.", tags: ["reggaeton", "latin", "urban"], featured: false },
  { n: 10, title: "Swing",                      category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Swing and Big Band tracks full of brass, syncopation, and retro cool.", tags: ["swing", "jazz", "bigband", "retro"], featured: false },
  { n: 11, title: "Trap",                       category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Trap productions with 808 bass, hi-hat rolls, and dark atmospheric pads.", tags: ["trap", "808", "hiphop", "dark"], featured: false },
  { n: 12, title: "Alternative Rock",           category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 Alternative Rock tracks balancing raw energy with melodic depth.", tags: ["alternative", "rock", "indie", "grunge"], featured: false },
  { n: 13, title: "Indie Pop",                  category: "Indie",      count: 50, price: 14999, origPrice: 24999, desc: "50 Indie Pop tracks with warm aesthetics, catchy hooks, and independent spirit.", tags: ["indie", "pop", "dreamy", "alternative"], featured: false },
  { n: 14, title: "Pop Rock",                   category: "Commercial", count: 25, price: 7499,  origPrice: 12999, desc: "25 Pop Rock tracks where punchy guitars meet radio-ready songwriting.", tags: ["pop", "rock", "catchy", "guitar"], featured: false },
  { n: 15, title: "House",                      category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 House tracks spanning deep, tech, and afro-house with four-on-the-floor grooves.", tags: ["house", "electronic", "groove", "club"], featured: false },
  { n: 16, title: "Techno",                     category: "Electronic", count: 25, price: 7499,  origPrice: 12999, desc: "25 industrial-grade Techno tracks forged for underground warehouses.", tags: ["techno", "industrial", "dark", "underground"], featured: false },
  { n: 17, title: "Metal",                      category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 Metal tracks with crushing riffs, blast beats, and powerful vocals.", tags: ["metal", "heavy", "guitar", "drums"], featured: false },
  { n: 18, title: "Pop Punk",                   category: "Commercial", count: 25, price: 7499,  origPrice: 12999, desc: "25 Pop Punk tracks with skate-punk energy and emotional anthems.", tags: ["poppunk", "punk", "guitar", "energetic"], featured: false },
  { n: 19, title: "Folk",                       category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 Folk tracks with acoustic warmth, storytelling, and organic instrumentation.", tags: ["folk", "acoustic", "organic", "storytelling"], featured: false },
  { n: 20, title: "Soul",                       category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 Soul tracks rich in gospel roots, deep groove, and emotional vulnerability.", tags: ["soul", "groove", "vocal", "emotional"], featured: false },
  { n: 21, title: "Gospel",                     category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 uplifting Gospel tracks filled with choir harmonies and spiritual energy.", tags: ["gospel", "choir", "spiritual", "uplifting"], featured: false },
  { n: 22, title: "Jazz",                       category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 Jazz tracks ranging from cool bebop to smooth contemporary lounges.", tags: ["jazz", "bebop", "smooth", "saxophone"], featured: false },
  { n: 23, title: "Classical",                  category: "Classic",    count: 25, price: 7499,  origPrice: 12999, desc: "25 orchestral Classical works spanning Baroque to Romantic for cinematic use.", tags: ["classical", "orchestra", "cinematic", "piano"], featured: true },
  { n: 24, title: "Hindi Electronic",           category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 Hindi Electronic tracks fusing Bollywood sensibilities with cutting-edge production.", tags: ["hindi", "electronic", "bollywood", "fusion"], featured: true },
  { n: 25, title: "Hindi Romance",              category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 romantic Hindi tracks perfect for wedding reels, love stories, and emotional moments.", tags: ["hindi", "romance", "love", "bollywood"], featured: false },
  { n: 26, title: "Hindi Rock",                 category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 Hindi Rock tracks blending Bollywood melodics with guitar-forward production.", tags: ["hindi", "rock", "guitar", "bollywood"], featured: false },
  { n: 27, title: "Hindi Dance",                category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 high-energy Hindi Dance tracks built for clubs, reels, and choreography.", tags: ["hindi", "dance", "club", "energetic"], featured: false },
  { n: 28, title: "Hindi Pop",                  category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 modern Hindi Pop tracks with catchy hooks for streaming and brand campaigns.", tags: ["hindi", "pop", "catchy", "modern"], featured: false },
  { n: 29, title: "Hindi Hip-Hop",              category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 desi hip-hop tracks spanning Mumbai gully rap to Delhi street culture.", tags: ["hindi", "hiphop", "rap", "desi"], featured: false },
  { n: 30, title: "Hindi Fusion",               category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 fusion tracks blending Indian classical instruments with global production styles.", tags: ["hindi", "fusion", "classical", "world"], featured: false },
  { n: 31, title: "Hindi Vintage",              category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 tracks recreating the golden era of Bollywood with vintage orchestration.", tags: ["hindi", "vintage", "retro", "bollywood"], featured: false },
  { n: 32, title: "Hindi Swing",                category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 Hindi Swing tracks merging Bollywood drama with jazz-influenced arrangements.", tags: ["hindi", "swing", "jazz", "bollywood"], featured: false },
  { n: 33, title: "Hindi Epic",                 category: "Bollywood",  count: 50, price: 14999, origPrice: 24999, desc: "50 cinematic Hindi Epic compositions for grand sequences, trailers, and storytelling.", tags: ["hindi", "epic", "cinematic", "orchestra"], featured: false },
  { n: 34, title: "Japanese / J-Pop",           category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 J-Pop and Japanese music tracks from kawaii pop to anime-inspired orchestral.", tags: ["jpop", "japanese", "anime", "kawaii"], featured: false },
  { n: 35, title: "Anime",                      category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Anime-style tracks capturing openings, endings, and dramatic OSTs.", tags: ["anime", "japanese", "ost", "dramatic"], featured: false },
  { n: 36, title: "Chinese / C-Pop",            category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 C-Pop and traditional Chinese music tracks with erhu, guzheng, and modern production.", tags: ["cpop", "chinese", "erhu", "guzheng"], featured: false },
  { n: 37, title: "Acoustic",                   category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 Acoustic tracks with warm guitar-driven arrangements for storytelling and emotion.", tags: ["acoustic", "guitar", "warm", "organic"], featured: false },
  { n: 38, title: "Polish",                     category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Polish music tracks blending folk traditions with contemporary arrangements.", tags: ["polish", "folk", "european", "traditional"], featured: false },
  { n: 39, title: "Brazilian Funk",             category: "Culture",    count: 25, price: 7499,  origPrice: 12999, desc: "25 Brazilian Funk tracks with hypnotic basslines and street energy.", tags: ["brazilian", "funk", "baile", "bass"], featured: false },
  { n: 40, title: "Lo-Fi",                      category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Lo-Fi hip-hop and chillhop tracks with dusty drums, warm pads, and study-hour vibes.", tags: ["lofi", "chill", "hiphop", "study"], featured: false },
  { n: 41, title: "Ambient",                    category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Ambient soundscapes for meditation, focus, and cinematic backgrounds.", tags: ["ambient", "atmospheric", "meditation", "space"], featured: false },
  { n: 42, title: "Blues",                      category: "Indie",      count: 25, price: 7499,  origPrice: 12999, desc: "25 Blues tracks from Delta-style guitar to electric Chicago blues.", tags: ["blues", "guitar", "soul", "delta"], featured: false },
  { n: 43, title: "Hard Rock",                  category: "Commercial", count: 50, price: 14999, origPrice: 24999, desc: "50 Hard Rock tracks with power chords, driving rhythm sections, and raw energy.", tags: ["hardrock", "guitar", "drums", "power"], featured: false },
  { n: 44, title: "Drum & Bass",               category: "Electronic", count: 25, price: 7499,  origPrice: 12999, desc: "25 Drum & Bass tracks with breakbeat energy, massive basslines, and rave urgency.", tags: ["dnb", "bass", "breakbeat", "rave"], featured: false },
  { n: 45, title: "Dubstep",                    category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Dubstep tracks from melodic to filthy wobble bass drops.", tags: ["dubstep", "bass", "wub", "electronic"], featured: false },
  { n: 46, title: "Trance",                     category: "Electronic", count: 25, price: 7499,  origPrice: 12999, desc: "25 Trance tracks with euphoric builds, arpeggiated synths, and emotional breakdowns.", tags: ["trance", "euphoric", "synth", "uplifting"], featured: false },
  { n: 47, title: "Afro House",                 category: "Electronic", count: 25, price: 7499,  origPrice: 12999, desc: "25 Afro House tracks with tribal percussion, deep grooves, and African influences.", tags: ["afrohouse", "tribal", "groove", "afrobeats"], featured: false },
  { n: 48, title: "Phonk",                      category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Phonk tracks with drift culture aesthetics, Memphis samples, and dark trap energy.", tags: ["phonk", "drift", "dark", "trap"], featured: false },
  { n: 49, title: "Hyperpop",                   category: "Electronic", count: 25, price: 7499,  origPrice: 12999, desc: "25 Hyperpop tracks with glitchy production, pitched vocals, and chaotic maximalism.", tags: ["hyperpop", "glitch", "chaotic", "pitched"], featured: false },
  { n: 50, title: "Tech House",                 category: "Electronic", count: 50, price: 14999, origPrice: 24999, desc: "50 Tech House tracks with rolling basslines, percussive grooves, and minimal elegance.", tags: ["techhouse", "house", "groove", "minimal"], featured: false },
  { n: 51, title: "Gaming & Streaming",         category: "Occasion",   count: 50, price: 14999, origPrice: 24999, desc: "50 Gaming and Streaming tracks for intros, background play, and hype moments.", tags: ["gaming", "streaming", "hype", "background"], featured: false },
  { n: 52, title: "Meditation & Yoga",          category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 calming Meditation and Yoga tracks with soothing frequencies and mindful pacing.", tags: ["meditation", "yoga", "calm", "breathing"], featured: false },
  { n: 53, title: "Content Creator",            category: "Occasion",   count: 50, price: 14999, origPrice: 24999, desc: "50 background music tracks curated for YouTubers, podcasters, and social creators.", tags: ["content", "background", "youtube", "creator"], featured: false },
  { n: 54, title: "Fitness & Workout",          category: "Occasion",   count: 50, price: 14999, origPrice: 24999, desc: "50 high-BPM Fitness and Workout tracks to push every rep and stay in the zone.", tags: ["fitness", "workout", "gym", "energy"], featured: false },
  { n: 55, title: "Podcast & Interview",        category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 subtle Podcast and Interview background tracks that never compete with voice.", tags: ["podcast", "interview", "subtle", "background"], featured: false },
  { n: 56, title: "Travel & Adventure",         category: "Occasion",   count: 50, price: 14999, origPrice: 24999, desc: "50 cinematic Travel and Adventure tracks for road trips, vlogs, and exploration.", tags: ["travel", "adventure", "cinematic", "vlog"], featured: false },
  { n: 57, title: "Corporate & Presentation",   category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 clean Corporate and Presentation tracks for pitches, promos, and business content.", tags: ["corporate", "clean", "professional", "business"], featured: false },
  { n: 58, title: "Lifestyle & Food",           category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 warm Lifestyle and Food tracks for recipe videos, cafe vibes, and daily vlogs.", tags: ["lifestyle", "food", "warm", "vlog"], featured: false },
  { n: 59, title: "Weddings & Events",          category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 ceremonial Weddings and Events tracks spanning mandap music to reception dance floors.", tags: ["wedding", "events", "ceremonial", "festive"], featured: false },
  { n: 60, title: "Study & Productivity",       category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 focus-enhancing Study and Productivity tracks for deep work and learning sessions.", tags: ["study", "focus", "productivity", "calm"], featured: false },
  { n: 61, title: "420 Sesh",                   category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 hazy, psychedelic tracks for relaxed listening sessions and creative flow states.", tags: ["chill", "psychedelic", "hazy", "relaxed"], featured: false },
  { n: 62, title: "Movies & OSTs",              category: "Occasion",   count: 50, price: 14999, origPrice: 24999, desc: "50 cinematic Movie and OST tracks for dramatic scenes, trailers, and epic storytelling.", tags: ["movies", "ost", "cinematic", "dramatic"], featured: false },
  { n: 63, title: "Love",                       category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 romantic Love tracks for couple content, wedding reels, and heartfelt moments.", tags: ["love", "romantic", "emotional", "couple"], featured: false },
  { n: 64, title: "Trippy",                     category: "Occasion",   count: 25, price: 7499,  origPrice: 12999, desc: "25 Trippy and psychedelic tracks for surreal visuals, art films, and mind-bending content.", tags: ["trippy", "psychedelic", "surreal", "experimental"], featured: false },
];

export const packs: Pack[] = packDefs.map((d) => ({
  id: `pack-${d.n}`,
  title: d.title,
  description: d.desc,
  coverUrl: `/packs/pack-${d.n}.png`,
  trackCount: d.count,
  totalDuration: d.count * 210,
  price: d.price,
  originalPrice: d.origPrice,
  genre: d.category,
  category: d.category,
  mood: "Mixed",
  tracks: expandPackTracks(`pack-${d.n}`, d.count),
  tags: d.tags,
  featured: d.featured,
}));

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
