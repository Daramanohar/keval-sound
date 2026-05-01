@AGENTS.md

# Keval Sound — AI Development Context

This file is the authoritative reference for all Claude sessions working on this project.
**Update this file immediately after every session that modifies the application.**

---

## Project Identity

- **Product**: Keval Sound — exclusive Indian music licensing platform
- **Owner/Contact**: manohar@kevalsound.com
- **GitHub**: https://github.com/Daramanohar/keval-sound
- **Live app**: https://app.kevalsound.com (Vercel, auto-deploys from `master`)
- **Landing page**: Separate Vercel project deploying `landing-page/` directory

---

## Stack & Conventions

- **Next.js 16.2.2 + React 19.2.4** — has breaking changes vs older Next.js; read `node_modules/next/dist/docs/` before writing routing or server component code
- **Tailwind CSS v4** — CSS-first via `@theme inline` in `src/app/globals.css`; NO `tailwind.config.js`; use `@theme` tokens not arbitrary values where possible
- **Framer Motion** — used for page transitions and card hover; do NOT add new AnimatePresence / motion wrappers to sidebar nav items (was the source of lag, already removed)
- **All state**: React Context in `src/lib/` — auth, player, store
- **Mock data only** — no real backend; localStorage for persistence
- **No tests** — zero test files in the repo; Phase 2 concern

---

## Completed Work Log

### Session 1 — Landing Page
- Fixed waitlist form (Google Apps Script endpoint, see memory)
- Added optimistic UI on form submit
- Fixed cursor (pointer missing on CTA button)
- Fixed social links
- Added genre marquee animation
- Removed duplicate `index.html` from repo root

### Session 2 — Next.js App — UI Polish & Smoothness

**Collapsible Left Sidebar**
- State lifted from `Sidebar.tsx` into `AppShell.tsx`
- CSS transition replaces framer-motion animate-width (was causing 11 simultaneous JS layout animations → visible lag)
- Sidebar widths: expanded=248px, collapsed=76px
- Main content padding: `lg:pl-[248px]` / `lg:pl-[76px]` with matching 200ms ease transition
- User preference persisted to `localStorage` key `"keval-sidebar-collapsed"`
- Nav labels: AnimatePresence removed → plain `<span>` with `transition-opacity duration-150`
- `[contain:layout_paint]` + `willChange:"width"` on the `<aside>` element

**Right Sidebar — StickySidebar component**
- New file: `src/components/StickySidebar.tsx`
- Twitter/Linear-style: sidebar scrolls naturally with page, locks to top when scrolling up, locks to bottom when scrolling down
- Algorithm: `position: sticky` always; `style.top` adjusted on scroll (not transform — transform caused a layout gap at page bottom)
- `scrollHeight` and `innerHeight` cached outside scroll handler (ResizeObserver + resize event) — prevents layout reflow on every scroll tick
- `will-change: transform` on the element for compositor promotion
- Wired in `src/app/page.tsx`: parent flex uses `lg:items-stretch`, right column wraps `<TrendingDiscoveryPanel>` in `<StickySidebar topOffset={96} bottomOffset={16}>`

**Carousel (ContentSection)**
- Velocity tracking with exponential smoothing: `velocity = prev * 0.6 + (dx/dt) * 0.4`
- Fling on release: `scrollBy({ left: -velocity * 220, behavior: "smooth" })` when `|velocity| > 0.3`
- Removed `scroll-smooth` class; set `scrollBehavior: "auto"` inline so drag is 1:1 with cursor
- `snap-mandatory` → `snap-proximity` (less robotic snapping)
- Drag threshold: 5px → 4px

**TrackCard**
- `aspect-square` → `aspect-[4/3]` (25% shorter cover art)
- Tighter spacing: `p-4` → `p-3`, smaller meta text, buttons `py-2.5` → `py-1.5`

**Explore grid**
- Capped at 4 columns: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`

**globals.css**
- Removed duplicate `html { scroll-behavior: smooth }` block (was at lines 5–7 AND 145–147)

---

## Files Modified (cumulative, post-revert baseline)

| File | What changed |
|---|---|
| `src/components/AppShell.tsx` | Lifted sidebar collapse state, dynamic padding, localStorage persistence |
| `src/components/Sidebar.tsx` | CSS transition, no framer-motion on labels, receives collapsed via props |
| `src/components/StickySidebar.tsx` | **NEW** — dynamic sticky right sidebar |
| `src/components/ContentSection.tsx` | Velocity fling, snap-proximity, scrollBehavior auto |
| `src/components/TrackCard.tsx` | aspect-[4/3], tighter spacing |
| `src/app/page.tsx` | StickySidebar import + wrapper, lg:items-stretch |
| `src/app/explore/page.tsx` | 4-column grid cap |
| `src/app/globals.css` | Remove duplicate scroll-behavior |

---

## Known Patterns — Follow These

**Sidebar toggle:** Always update `AppShell.tsx` for sidebar state — do NOT add local state back inside `Sidebar.tsx`.

**Scroll performance:** Never call `el.scrollHeight`, `el.getBoundingClientRect()`, or `window.innerHeight` inside a scroll event handler. Cache these values with ResizeObserver / resize events and read from a ref.

**Animations:** Use CSS transitions (`transition-[X] duration-200`) for layout-affecting properties (width, padding). Reserve Framer Motion for decorative animations only (card hover, page entry).

**CSS tokens:** All brand colors and utility classes live in `src/app/globals.css` under `@theme inline`. Use token names (e.g. `text-vivid-blue`, `bg-glass-card`) not arbitrary hex values.

**No new framer-motion wrappers on navigation elements** — sidebar nav items use plain CSS transitions; adding AnimatePresence back will reintroduce lag.

---

## Phase 2 — Not Yet Built

These are the next major workstreams (do not implement without explicit user instruction):

1. **License tier picker** — MP3 ₹200 / WAV ₹300 / Stems ₹400 / Exclusive ₹500 on each TrackCard/MusicCard
2. **Exclusive removal** — on checkout with exclusive license, mark track `status: "exclusive_sold"` and filter from all catalog views
3. **`/pricing` page** — subscription tiers (Basic ₹299 / Standard ₹999 / Pro ₹2500 / Enterprise ₹4999)
4. **My Library** — account page section showing owned tracks with download buttons
5. **Real backend** — Postgres + R2 storage, Razorpay payments, real auth (see `Keval_Sound_MVP_Architecture_Report.pdf`)

---

## Update Instructions

**After every session that ships code:**
1. Add an entry to the "Completed Work Log" section above describing what changed and why
2. Update the "Files Modified" table
3. Note any new patterns or gotchas under "Known Patterns"
4. Commit this file along with the code changes
