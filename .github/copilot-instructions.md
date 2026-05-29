# Copilot Cloud Agent Instructions — Keval Sound

## Project Overview

Keval Sound is an **exclusive Indian music licensing platform** built with Next.js. The core feature: when a creator buys an Exclusive license, the track is permanently removed from the catalog.

- **Live app**: https://app.kevalsound.com (auto-deploys from `master` via Vercel)
- **Landing page**: Separate Vercel project deploying `landing-page/` directory

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.2** + React 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-first config via `@theme inline` in `src/app/globals.css`) |
| Animations | Framer Motion (page transitions, cards); GSAP (landing page) |
| Icons | Lucide React |
| State | React Context (`src/lib/` — auth, player, store, toast, song-detail) |
| Data | In-memory mock data with localStorage persistence — no real backend yet |
| Font | Google Fonts "Sora" loaded via `next/font/google` |
| Deployment | Vercel (auto-deploy on push to `master`) |

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (validates all routes)
npm run lint         # ESLint (eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit    # Type-check without emitting
```

### Known Build Issue — Google Fonts in Restricted Environments

`npm run build` may fail with:
```
Failed to fetch `Sora` from Google Fonts.
```
This occurs in sandboxed/offline environments where external network access to `fonts.googleapis.com` is blocked. The build succeeds in normal environments and on Vercel. **Do not attempt to "fix" this by removing the font** — it is intentional and works in production.

**Workaround for validation in restricted environments**: Use `npm run lint` and `npx tsc --noEmit` to verify code correctness without a full build.

## Project Structure

```
keval-sound/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── layout.tsx       # Root layout (providers, AppShell, PersistentPlayer)
│   │   ├── globals.css      # Design system tokens (@theme inline)
│   │   ├── page.tsx         # Home
│   │   ├── explore/         # Full catalog with genre filter
│   │   ├── packs/           # 64 soundpacks grid
│   │   ├── pack/[id]/       # Individual pack detail
│   │   ├── samples/         # Sample browser
│   │   ├── player/          # Production catalog player
│   │   ├── song/[id]/       # Song detail page
│   │   ├── cart/            # Cart + checkout
│   │   ├── account/         # Wishlist, history, purchases, downloads, playlists
│   │   └── auth/            # Sign-up / Sign-in
│   ├── components/          # All UI components (30+ files)
│   └── lib/                 # Contexts, utilities, mock data
│       ├── mock-data.ts     # All tracks, packs, samples, genres (large file ~45KB)
│       ├── auth-context.tsx
│       ├── player-context.tsx
│       ├── store-context.tsx
│       ├── toast-context.tsx
│       ├── song-detail-context.tsx
│       ├── production-catalog.ts
│       └── production-catalog.generated.ts  # Auto-generated, >500KB — do not edit manually
├── landing-page/            # Static HTML landing page (separate Vercel project)
├── scripts/                 # Catalog generation and R2 staging scripts
├── public/                  # Static assets (pack artwork: public/packs/pack-1.png..pack-64.png)
├── CLAUDE.md                # Full dev log from all prior sessions (authoritative history)
└── AGENTS.md                # Next.js agent rules (read node_modules/next/dist/docs/)
```

## Key Conventions

### Styling
- **Tailwind CSS v4 CSS-first** — tokens defined via `@theme inline` in `globals.css`. There is NO `tailwind.config.js`.
- Use existing design tokens (e.g. `bg-vampire-black`, `text-vivid-blue`, `text-muted`) rather than arbitrary values.
- Glassmorphism utility: `glass-card` class. Gradient text: `gradient-text` class.

### Path Aliases
- `@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Data Layer
- All mock data lives in `src/lib/mock-data.ts`.
- The `allTracks` export flattens pack tracks with real audio into the catalog (used by Explore).
- The top-level `tracks` export (12 seed items) is used by the Home page — don't replace with `allTracks`.
- Genre values are UPPERCASE strings matching the 25 canonical buckets from `GENRES.pdf` (e.g., `"HINDI/BOLLYWOOD"`, `"HIP-HOP/RAP"`).

### Layout Architecture
- `AppShell` wraps all authenticated routes with sidebar + topbar.
- Sidebar is collapsible (76px collapsed / 248px expanded); preference stored in localStorage.
- Desktop sidebar toggle: hamburger inside the sidebar header (YouTube Music pattern).
- Mobile sidebar: slide-in drawer toggled from TopBar hamburger.
- The breakpoint is `lg:` (1024px); `AppShell` uses `window.innerWidth >= 1024` to match.

### Animation Guidelines
- **Do NOT** add Framer Motion `AnimatePresence` or `motion` wrappers to sidebar nav items (causes lag — was previously removed).
- Page transitions use Framer Motion via `PageTransition` component.

### Important Do-Nots
- Do NOT edit `src/lib/production-catalog.generated.ts` manually — it is auto-generated by `scripts/generate-production-catalog.mjs`.
- Do NOT drop `max-w-4xl` from `/song/[id]` — kept for readability.
- The Home page (`/`) layout is intentionally different from other pages — do not "normalize" it unless explicitly asked.
- `final.fix.md` at the repo root is **stale** — do not use it as a brief.

### Next.js 16 Specifics
- This version has **breaking changes** vs older Next.js. Before writing routing or server component code, read the relevant guide in `node_modules/next/dist/docs/`.
- All pages under `src/app/` use the App Router pattern.

## Testing

There are **no tests** in this repository currently. Validation is done via:
1. `npm run lint` (must pass with 0 errors)
2. `npx tsc --noEmit` (must pass)
3. `npm run build` (must pass in unrestricted environments)

## Environment Variables

- `NEXT_PUBLIC_KEVAL_STREAMS_READY` — gates playback in the Player route. Until real MP3 paths are uploaded to R2, Player shows tracks but blocks playback with a toast.

## Prior Session Context

The `CLAUDE.md` file at repo root contains a detailed development log from 17+ sessions. Consult it for history on why things were built a specific way and what trade-offs were made.
