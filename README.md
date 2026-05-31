# Keval Sound

Exclusive music marketplace and streaming player for creators, filmmakers, editors, brands, and music buyers.

Keval Sound is built around a simple product rule:

- Users can preview full songs as MP3 streams.
- Buyers purchase songs or packs to receive WAV downloads.
- Keval Player users can listen in MP3 for free, and a paid INR 49 Player plan unlocks WAV streaming.

The platform is designed as a production music catalog, not a demo library. The current catalog pipeline indexes the local production source folder, generates searchable metadata, stages public MP3/lyrics assets and private WAV assets, and syncs them to Cloudflare R2 for CDN delivery.

Live application:

- App: `https://app.kevalsound.com`
- CDN: `https://cdn.kevalsound.com`

---

## Current Status

Implemented in this repository:

- Next.js 16 App Router frontend with authenticated app shell.
- YouTube Music-inspired Keval Player at `/player`.
- Production pack browser at `/packs`.
- Pack detail pages at `/pack/[id]`.
- Song detail pages at `/song/[id]`.
- Cart, wishlist, local checkout history, recently played, and persistent audio player.
- Metadata-driven production catalog search.
- Production catalog generator from the local source folder.
- Cloudflare R2 staging scripts for MP3, lyrics, and WAV assets.
- Vercel deployment connected to GitHub `master`.

Current prototype limitations:

- Auth is localStorage-based, not a real identity provider yet.
- Cart and orders are localStorage-based, not persisted to a database yet.
- Payment gateway integration is planned, not completed.
- Private WAV access must be gated by a Cloudflare Worker/payment entitlement flow before real paid downloads or paid WAV streaming are enabled.

---

## Product Model

### Keval App

Main marketplace experience on `app.kevalsound.com`.

| User state | Action | Format |
|---|---|---|
| Visitor or free user | Stream full previews | MP3 |
| Buyer | Download purchased song | WAV |
| Buyer | Browse and purchase packs/songs | Catalog metadata + cart |

### Keval Player

Dedicated listening surface inside the same app at `/player`.

| User state | Action | Format |
|---|---|---|
| Free Player user | Stream catalog | MP3 |
| Paid Player user | Stream premium quality | WAV |

The Player defaults to the `Occasion` category and supports category tabs across the catalog.

---

## Architecture Overview

```text
Local production source folder
keval-packs/SOUND PACKS(Main Version)
        |
        | scripts/generate-production-catalog.mjs
        v
Generated TypeScript catalog
src/lib/production-catalog.generated.ts
src/lib/production-home.generated.ts
        |
        | staging scripts
        v
output/r2-public/       -> public MP3 + lyrics
output/r2-private/wav/  -> private WAV
        |
        | rclone sync
        v
Cloudflare R2 bucket: keval-sound-prod
        |
        v
Cloudflare CDN: cdn.kevalsound.com
        |
        v
Next.js app on Vercel: app.kevalsound.com
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2, App Router |
| UI | React 19.2.4 |
| Styling | Tailwind CSS v4, CSS design tokens |
| Icons | Lucide React |
| Animation | Framer Motion, GSAP where needed |
| Audio | Native browser audio, React player context |
| Search | Generated metadata index with weighted matching |
| Catalog data | Generated TypeScript modules from local source files |
| Storage/CDN | Cloudflare R2 + custom CDN domain |
| Upload tooling | rclone + custom staging scripts |
| Deployment | Vercel, auto-deploy from GitHub |

---

## Repository Structure

```text
keval-sound/
├── src/
│   ├── app/
│   │   ├── page.tsx              # authenticated home + public landing
│   │   ├── player/page.tsx       # Keval Player route
│   │   ├── packs/page.tsx        # production pack catalog
│   │   ├── pack/[id]/page.tsx    # pack detail
│   │   ├── song/[id]/page.tsx    # song detail
│   │   ├── explore/page.tsx      # exploration/search surface
│   │   ├── cart/page.tsx
│   │   ├── account/page.tsx
│   │   └── auth/page.tsx
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── KevalPlayer.tsx
│   │   ├── PersistentPlayer.tsx
│   │   ├── MusicCard.tsx
│   │   ├── TrackCard.tsx
│   │   └── TrendingDiscoveryPanel.tsx
│   └── lib/
│       ├── auth-context.tsx
│       ├── store-context.tsx
│       ├── player-context.tsx
│       ├── production-catalog.ts
│       ├── production-catalog.generated.ts
│       ├── production-home.generated.ts
│       └── mock-data.ts
├── scripts/
│   ├── generate-production-catalog.mjs
│   ├── stage-r2-public-assets.mjs
│   ├── stage-r2-private-wavs.mjs
│   └── import-demo-packs.mjs
├── public/
│   └── packs/                    # album art
└── output/                       # generated staging output, gitignored
```

---

## Frontend

The frontend is a Next.js App Router application with a persistent authenticated shell.

Key UI surfaces:

- `AppShell`: authenticated layout with sidebar, top bar, footer, route prefetching, and persistent page structure.
- `Sidebar`: main navigation for Browse, Player, Explore, Packs, Samples, Wishlist, Purchases, Downloads, and Playlists.
- `TopBar`: global search prompt, account controls, support/action icons, cart.
- `PersistentPlayer`: bottom audio player with waveform, seek/progress, controls, and song drawer integration.
- `KevalPlayer`: category-based streaming player inspired by modern music apps.
- `ContentSection`: horizontal rails for home sections.
- `MusicCard` and `TrackCard`: reusable catalog card components.

Performance work already included:

- Lightweight home catalog so the home page does not load the full production search index.
- Player route preloading.
- Production catalog preloading when the Player is hovered/focused.
- Deferred Player search input.
- Offscreen Player rows optimized with `content-visibility`.
- Native vertical scrolling preserved over horizontal rails.

---

## Catalog and Search

The production catalog is generated from the local source folder:

```text
keval-packs/SOUND PACKS(Main Version)
```

Expected source structure:

```text
SOUND PACKS(Main Version)/
├── CATEGORY/
│   ├── PACK NAME/
│   │   ├── SONG NAME/
│   │   │   ├── song.mp3
│   │   │   ├── song.wav
│   │   │   ├── lyrics.txt        # optional, absent for instrumental tracks
│   │   │   └── MDATA.txt         # internal metadata used for search
```

Important rules:

- MP3 files are used for public preview streaming.
- WAV files are staged under private R2 paths for paid download/paid Player streaming.
- Lyrics files are optional. If a song folder has no lyrics file, the catalog treats it as instrumental.
- `MDATA.txt` is not shipped to users directly. Its contents are converted into searchable metadata.

Generated files:

- `src/lib/production-catalog.generated.ts`: full production catalog.
- `src/lib/production-home.generated.ts`: lightweight home-page catalog.

Search logic lives in:

```text
src/lib/production-catalog.ts
```

The search scorer weighs:

- exact title match
- title prefix
- title contains
- pack title
- tags
- normalized metadata text
- MP3/WAV availability

This allows searches such as mood, use case, genre, instrument, metadata phrase, pack name, or title.

---

## Cloudflare R2 Media Pipeline

R2 bucket:

```text
keval-sound-prod
```

CDN domain:

```text
https://cdn.kevalsound.com
```

R2 layout:

```text
keval-sound-prod/
├── public/
│   ├── art/
│   ├── lyrics/
│   └── mp3/
└── private/
    └── wav/
```

Public assets:

- `public/mp3`: full MP3 preview streams.
- `public/lyrics`: public lyrics text files.
- `public/art`: album/pack artwork.

Private assets:

- `private/wav`: WAV masters for purchased downloads and paid Player streaming.

Security note:

`private/wav` must not be served publicly from the CDN. Before enabling paid WAV delivery, block `/private/*` at Cloudflare and serve WAV files only through a Worker that verifies purchase/subscription entitlement and redirects to a short-lived signed URL.

Recommended Cloudflare block rule:

```text
(http.host eq "cdn.kevalsound.com" and starts_with(http.request.uri.path, "/private/"))
```

---

## Catalog Generation and Upload Commands

Generate catalog:

```bash
npm run catalog:generate
```

Stage public MP3/lyrics:

```bash
npm run r2:stage-public
```

Stage private WAV files:

```bash
npm run r2:stage-wav
```

Sync public MP3 files to R2:

```bash
rclone sync output/r2-public/mp3 r2-keval:keval-sound-prod/public/mp3 --checksum --fast-list --checkers=16 --transfers=8 --progress
```

Sync public lyrics to R2:

```bash
rclone sync output/r2-public/lyrics r2-keval:keval-sound-prod/public/lyrics --checksum --fast-list --checkers=16 --transfers=8 --progress
```

Sync private WAV files to R2:

```bash
rclone sync output/r2-private/wav r2-keval:keval-sound-prod/private/wav --checksum --fast-list --checkers=16 --transfers=4 --progress
```

Verify MP3 sync:

```bash
rclone check output/r2-public/mp3 r2-keval:keval-sound-prod/public/mp3 --checksum --one-way
```

Verify WAV sync:

```bash
rclone check output/r2-private/wav r2-keval:keval-sound-prod/private/wav --checksum --one-way
```

---

## Backend, APIs, and Database Plan

The current repository is frontend-first with generated static catalog data and localStorage-backed auth/store state. The production backend should be added in the next phase.

Planned database tables:

| Table | Purpose |
|---|---|
| `users` | Real user accounts and identity provider mapping |
| `songs` | Canonical song metadata, pack relation, MP3/WAV object paths |
| `packs` | Pack metadata, category, cover art, pricing |
| `purchases` | One-time song/pack purchases |
| `subscriptions` | Keval Player INR 49 WAV streaming entitlement |
| `download_events` | Audit trail for paid WAV downloads |
| `stream_events` | Playback and analytics events |

Planned API/Worker surface:

| Endpoint | Responsibility |
|---|---|
| `GET /stream?trackId=...&format=mp3` | Public MP3 preview or free Player stream |
| `GET /stream?trackId=...&format=wav` | Paid Player WAV stream entitlement check |
| `GET /download?trackId=...` | Purchased WAV download entitlement check |
| `POST /webhooks/payment` | Payment gateway webhook to create purchase/subscription records |
| `GET /catalog/search?q=...` | Server-side catalog search when the catalog moves to a database |

Recommended delivery pattern for WAV:

```text
Client -> Worker/API -> verify JWT -> check purchases/subscriptions -> issue signed R2 redirect
```

Use redirect instead of proxying bytes through the Worker so browser range requests and audio seeking continue to work.

---

## Deployment

GitHub is connected to Vercel.

```text
push to master -> Vercel build -> production deployment
```

Production routes are served from:

```text
https://app.kevalsound.com
```

Cloudflare manages DNS for `kevalsound.com`, and R2 serves media from:

```text
https://cdn.kevalsound.com
```

Build checks:

```bash
npm run lint
npm run build
```

---

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run production build locally:

```bash
npm run build
npm run start
```

Useful scripts:

```bash
npm run lint
npm run catalog:generate
npm run r2:stage-public
npm run r2:stage-wav
```

Environment toggle:

```bash
NEXT_PUBLIC_KEVAL_STREAMS_READY=0
```

Setting this disables stream URLs in the generated production catalog during local testing.

---

## Resume Summary

Suggested resume entry:

```text
Keval Sound - Exclusive Music Marketplace and Streaming Player

Built and deployed a production music licensing platform using Next.js 16, React 19, Tailwind CSS, Vercel, and Cloudflare R2. Designed a catalog pipeline that scans local MP3/WAV source folders, extracts metadata, generates searchable TypeScript indexes, stages public MP3/lyrics files and private WAV masters, and syncs assets to Cloudflare R2. Implemented a YouTube Music-inspired player, metadata-ranked search, pack browsing, persistent audio playback, cart/wishlist flows, and production deployment automation through GitHub and Vercel.
```

Short bullet version:

- Built a Next.js 16 music licensing marketplace with authenticated app shell, cart, wishlist, pack browsing, and persistent audio preview player.
- Implemented Keval Player, a category-based streaming interface with metadata search and MP3/WAV product logic.
- Created a production catalog generator for 60 live packs and 2,700+ indexed songs using MP3, WAV, lyrics, and metadata source files.
- Designed and executed a Cloudflare R2 media pipeline for CDN-backed MP3 streaming and private WAV delivery.
- Deployed the platform on Vercel with GitHub auto-deploy and Cloudflare DNS/CDN integration.

---

## Project Highlights

- Production catalog ingestion from real local music folders.
- Metadata-ranked search designed around song title, pack title, tags, and detailed `MDATA.txt` descriptions.
- Cloud storage architecture optimized for audio delivery using Cloudflare R2 to avoid traditional egress costs.
- Separate business logic for marketplace previews, purchased WAV downloads, free Player MP3 streaming, and paid Player WAV streaming.
- Smooth app navigation, route prefetching, deferred catalog search, lightweight home catalog, and optimized offscreen Player rendering.

---

## Important Operational Notes

- Do not commit R2 API keys, Cloudflare tokens, or rclone config.
- Do not expose `private/wav` publicly.
- Regenerate the catalog after changing the local source folder.
- Run `rclone check` after every large upload.
- Run `npm run lint` and `npm run build` before pushing to production.
