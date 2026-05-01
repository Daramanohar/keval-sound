# Keval Sound — Exclusive Indian Music Licensing Platform

Keval Sound is an exclusive music licensing platform built for Indian creators. The core differentiator: when a creator buys an **Exclusive license**, the track is permanently removed from the catalog — no one else can license it.

---

## Project Structure

```
keval-sound/
├── landing-page/          # Static HTML landing page (deployed to Vercel separately)
│   └── index.html
├── src/                   # Next.js 16 application (the main platform)
│   ├── app/               # Routes: /, /explore, /packs, /pack/[id], /samples, /cart, /account, /auth
│   ├── components/        # UI components
│   └── lib/               # Auth, player, store contexts + mock data
├── CLAUDE.md              # AI assistant context & development log
└── README.md              # This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 + React 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-first, `@theme inline` tokens) |
| Animations | Framer Motion |
| Icons | Lucide React |
| State | React Context (auth, player, cart/store) |
| Data | In-memory mock data (localStorage persistence) |
| Auth | Mock auth (localStorage) |
| Deployment | Vercel (auto-deploy on push to `master`) |

---

## Local Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build check
```

---

## Deployment

The app auto-deploys to Vercel on every push to `master`.

- **Main app**: deployed from repo root (`src/` → Next.js)
- **Landing page**: deployed from `landing-page/` as a separate static Vercel project

---

## Current Status — What Is Built

### ✅ Infrastructure
- Next.js 16 app with 8 routes fully scaffolded
- Token-based design system (`globals.css` — colors, gradients, glassmorphism utilities)
- Auth context with sign-up/sign-in/sign-out (localStorage mock)
- Player context (preview playback, progress tracking)
- Cart/store context (add to cart, checkout, order history)

### ✅ UI & Layout (Production-Grade Polish)
- **AppShell** — authenticated shell with collapsible left sidebar, animated route transitions
- **Left Sidebar** — collapsible (76px / 248px), persists user preference to localStorage, smooth CSS transition (no JS animation lag), active-route indicator with spring animation
- **Right Sidebar (StickySidebar)** — Twitter/Linear-style dynamic sticky: scrolls naturally with page, locks to top when scrolling up, locks to bottom when scrolling down; no layout gaps
- **TopBar** — sticky header with search bar (AI-optimized prompt support), cart icon, user menu
- **ContentSection** — horizontal carousel with drag-to-scroll, fling/momentum on release, left/right arrow buttons, `snap-proximity`
- **TrackCard** — compact 4:3 aspect ratio card with play/cart actions
- **MusicCard** — multi-variant card (default, compact, wide) for Browse/Packs/Samples
- **Navbar / Footer** — public pages (landing + auth)

### ✅ Pages
| Route | Description |
|---|---|
| `/` | Home — featured hero, trending tracks, sample lab, top songs list |
| `/explore` | Full catalog grid (4 columns), genre/mood filters, list/grid toggle |
| `/packs` | **64 real soundpacks**, 1:1 album art, 7 category filters (Commercial / Electronic / Bollywood / Indie / Culture / Occasion / Classic) |
| `/pack/[id]` | Individual pack detail with track listing |
| `/samples` | Sample browser |
| `/cart` | Cart with line items and checkout |
| `/account` | Tabbed account page: Wishlist, Recently Played, Purchases, Downloads, Playlists |
| `/auth` | Sign-up / Sign-in |

### 📦 Pack Catalog (64 packs / 2,375 songs)

Album art lives in `public/packs/pack-1.png` through `pack-64.png` (sequential — matches the source ordering in `keval-packs/`). Pack metadata (titles, song counts, categories) lives in `src/lib/mock-data.ts` as the `packDefs[]` array.

| Category | Pack Count |
|---|---|
| Commercial | 9 |
| Electronic | 14 |
| Bollywood | 10 |
| Indie | 7 |
| Culture | 9 |
| Occasion | 14 |
| Classic | 1 |

---

## What Is NOT Yet Built (Phase 2)

These are expected gaps — the app uses mock data for now:

- Real backend (database, file storage, CDN)
- Real payments (Razorpay / Stripe)
- Real authentication (JWT / OAuth)
- Exclusive track removal from real DB on purchase
- 4-tier license price picker (MP3 ₹200 / WAV ₹300 / Stems ₹400 / Exclusive ₹500)
- Subscription billing (Basic ₹299 / Standard ₹999 / Pro ₹2500 / Enterprise ₹4999)
- `/pricing` page
- Real file delivery / downloads
- Audio fingerprinting, AI mood detection

All Phase 2 architecture is documented in `Keval_Sound_MVP_Architecture_Report.pdf`.

---

## Design Tokens (Key)

Defined in `src/app/globals.css` via `@theme inline`:

| Token | Value | Usage |
|---|---|---|
| `vampire-black` | `#0c0d1c` | Page background |
| `vivid-blue` | `#3b6bff` | Primary accent, active states |
| `mid-purple` | `#5b4282` | Gradient partner to vivid-blue |
| `grey-magenta` | `#6b1454` | Exclusive badge color |
| `muted` | `#8a8aa0` | Secondary text |
| `glass-card` | utility class | Glassmorphism card surface |
| `gradient-text` | utility class | Blue→purple text gradient |

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/globals.css` | Design system — all tokens, utility classes |
| `src/lib/mock-data.ts` | All mock tracks, packs, samples |
| `src/lib/store-context.tsx` | Cart, checkout, wishlist, order history |
| `src/lib/auth-context.tsx` | Auth state |
| `src/lib/player-context.tsx` | Audio preview player |
| `src/components/AppShell.tsx` | Authenticated layout wrapper |
| `src/components/Sidebar.tsx` | Left navigation sidebar |
| `src/components/StickySidebar.tsx` | Right sidebar scroll behavior |
| `src/components/ContentSection.tsx` | Horizontal drag carousel |
| `src/components/TrackCard.tsx` | Track card for explore grid |
| `src/components/MusicCard.tsx` | Multi-variant card for packs/samples |
