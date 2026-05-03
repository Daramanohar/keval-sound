// Imports the 6 DEMO sound packs into public/ and emits a TypeScript data
// snippet (printed to stdout) that drops into src/lib/mock-data.ts.
//
//   - Copies each <song>.mp3 to public/audio/<pack-id>/<slug>.mp3
//   - Copies each <song> - Lyrics.txt to public/lyrics/<pack-id>/<slug>.txt
//   - Skips MDATA.txt files entirely (metadata is internal-only per spec)
//
// Run:  node scripts/import-demo-packs.mjs > scripts/.demo-songs.snippet.ts

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("keval-packs/2. SOUND PACKS/DEMO");
const PUB_AUDIO = path.resolve("public/audio");
const PUB_LYRICS = path.resolve("public/lyrics");

// Source folder name → pack id in mock-data.ts
const PACK_MAP = {
  "BOLLY DANCE V1":   { id: "pack-27", artist: "Mumbai Floor",    genre: "Hindi Dance",      mood: "Energetic" },
  "BOLLY ELECTRO V1": { id: "pack-24", artist: "Bombay Wires",    genre: "Hindi Electronic", mood: "Hypnotic"  },
  "BOLLY HIP HOP V1": { id: "pack-29", artist: "Gully Beats",     genre: "Hindi Hip-Hop",    mood: "Hard"      },
  "BOLLY POP V1":     { id: "pack-28", artist: "Studio 47",       genre: "Hindi Pop",        mood: "Bright"    },
  "BOLLY ROCK V1":    { id: "pack-26", artist: "Dilli Riots",     genre: "Hindi Rock",       mood: "Driving"   },
  "BOLLY ROMANCE V1": { id: "pack-25", artist: "Velvet Strings",  genre: "Hindi Romance",    mood: "Romantic"  },
};

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")    // strip combining diacritics
    .replace(/[^\x00-\x7F]/g, "")       // strip all non-ASCII (Devanagari etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const out = [];

for (const folderName of Object.keys(PACK_MAP)) {
  const folder = path.join(ROOT, folderName);
  if (!fs.existsSync(folder)) {
    console.error(`SKIP missing folder: ${folder}`);
    continue;
  }
  const meta = PACK_MAP[folderName];
  const audioDest = path.join(PUB_AUDIO, meta.id);
  const lyricsDest = path.join(PUB_LYRICS, meta.id);
  fs.mkdirSync(audioDest, { recursive: true });
  fs.mkdirSync(lyricsDest, { recursive: true });

  const entries = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".mp3"));
  const songs = [];

  for (const mp3 of entries) {
    const base = mp3.replace(/\.mp3$/i, "");
    const slug = slugify(base);
    const lyricsName = `${base} - Lyrics.txt`;
    const lyricsSrc = path.join(folder, lyricsName);

    fs.copyFileSync(path.join(folder, mp3), path.join(audioDest, `${slug}.mp3`));
    if (fs.existsSync(lyricsSrc)) {
      fs.copyFileSync(lyricsSrc, path.join(lyricsDest, `${slug}.txt`));
    } else {
      console.error(`!!  no lyrics file found for ${mp3}`);
    }

    // Display title: keep the original (with parentheses, Devanagari) for UI
    songs.push({
      slug,
      title: base,
      audioUrl: `/audio/${meta.id}/${slug}.mp3`,
      lyricsUrl: `/lyrics/${meta.id}/${slug}.txt`,
    });
  }

  out.push({ packId: meta.id, artist: meta.artist, genre: meta.genre, mood: meta.mood, songs });
}

// Emit TypeScript snippet to stdout
console.log("// AUTO-GENERATED — see scripts/import-demo-packs.mjs");
console.log("export const demoPackSongs: Record<string, {");
console.log("  artist: string; genre: string; mood: string;");
console.log("  songs: { slug: string; title: string; audioUrl: string; lyricsUrl: string }[];");
console.log("}> = {");
for (const pack of out) {
  console.log(`  "${pack.packId}": {`);
  console.log(`    artist: ${JSON.stringify(pack.artist)},`);
  console.log(`    genre: ${JSON.stringify(pack.genre)},`);
  console.log(`    mood: ${JSON.stringify(pack.mood)},`);
  console.log(`    songs: [`);
  for (const s of pack.songs) {
    console.log(`      { slug: ${JSON.stringify(s.slug)}, title: ${JSON.stringify(s.title)}, audioUrl: ${JSON.stringify(s.audioUrl)}, lyricsUrl: ${JSON.stringify(s.lyricsUrl)} },`);
  }
  console.log(`    ],`);
  console.log(`  },`);
}
console.log("};");

console.error(`\nImported ${out.reduce((n, p) => n + p.songs.length, 0)} songs across ${out.length} packs.`);
