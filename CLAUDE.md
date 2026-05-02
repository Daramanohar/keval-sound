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

### Session 9 — Pack Detail: Now-Playing Waveform Overlay + Three-Dot Track Menu

Two additions to `src/app/pack/[id]/page.tsx`.

**1. Now-playing waveform overlay on the row thumbnail (YT Music-style)**
- New inline component `PlayingOverlay` — three white vertical bars pulsing in sequence, centered on a `bg-black/45` scrim
- Bars reuse the `.waveform-bar` class + `waveform` keyframe already defined in `globals.css` (lines 93–96, 258–271). nth-child(1..3) inherit staggered animation delays from there — no new CSS needed
- Rendered inside both the `lg+` thumbnail cell and the mobile thumbnail block, gated on `trackPlaying = isItemPlaying(track.id, "track")`
- Both thumbnail wrappers gained `relative` + `z-10` on the overlay so it floats above the cover image

**2. Three-dot context menu per song row**
- New 9th column added to the table grid: `[40px_48px_1fr_180px_72px_56px_56px_120px_40px]`
- Trigger is a `MoreVertical` icon button on the right edge of each row
- Page-level `openMenu: string | null` state — exactly one menu open at a time (opening another row's menu auto-closes the previous via state replacement)
- Outside-click dismissal: a `mousedown` document listener installed only when a menu is open. Each menu wrapper carries `data-track-menu={track.id}`; the listener closes the menu unless `target.closest("[data-track-menu]")` matches the currently open id. This pattern handles "click another row's button" correctly — the click first lands in a *different* wrapper, mousedown fires close, then onClick fires open for the new row
- Dropdown is a `motion.div` with `AnimatePresence` (scale + fade-in, 120ms) — premium feel without being heavy
- Removed `overflow-hidden` from the outer table container (was clipping the dropdown). Visual side effect: row hover backgrounds now extend slightly past the rounded corners on the first/last row during hover — barely perceptible against the dark theme; not worth a portal solution at this time

**Menu actions**
| Label | Behavior |
|---|---|
| Share Track | Copies `${origin}/pack/${packId}#track-${trackId}` to clipboard, toasts "Track link copied" |
| Add to Playlist | Toasts "Playlists coming soon" (Phase 2) |
| Add to Cart | Calls `handleTrackAdd(track)` — same flow as the row's primary CTA |
| Save to Crate | Toasts "Crates coming soon" (Phase 2 — kept distinct from wishlist intentionally) |
| View Similar Tracks | Toasts "Similar tracks coming soon" (Phase 2) |
| Preview Full Track | Calls `toggleTrack(track, { queue: pack.tracks, pack })` |
| Report an Issue | Toasts "Thanks — issue noted" (Phase 2) |

A divider separates "Report an Issue" from the rest.

**New helper component** `TrackMenuItem({ icon, label, onClick })` — defined at file bottom. Generic dropdown row with icon + label; not exported (page-private).

**Imports added**: `useEffect`, `AnimatePresence`, plus icons `Bookmark`, `Flag`, `ListPlus`, `MoreVertical`, `Plus`, `Sparkles`.

**Files modified**
- `src/app/pack/[id]/page.tsx`

**Notes for future sessions**
- The outside-click pattern (`data-track-menu` + `target.closest()`) is preferred over per-row refs when the menus are rendered inside a `.map()` — extends to N rows without a refs map
- If the dropdown ever needs to escape the table boundary (e.g., row near viewport edge), switch to a portal — the trigger already has `data-track-menu` so the dismissal logic can stay
- The waveform keyframe in `globals.css` animates `height: 20% → 80%` of parent. The bar markup uses `h-3.5` parent (14px) + `h-full` bars so the height-percent animation has a fixed reference

---

### Session 8 — Pack Detail: "Add to Cart" Label + Per-Song Pack-Art Thumbnail

Two targeted changes to `src/app/pack/[id]/page.tsx`:

**1. Label rename: "License This" → "Add to Cart"**
- Header column on the song table renamed
- Per-row button default state simplified to text-only "Add to Cart" (no `Plus` icon)
- "In Cart" state simplified to text-only as well (no `ShoppingCart` icon) — kept consistent with the directive "no icons, just the label"
- "Owned" state unchanged
- `Plus` and `ShoppingCart` imports removed from `lucide-react`

**2. Per-song pack-art thumbnail (YouTube Music-style row leadin)**
- Every song row now begins with a 40×40 thumbnail of the pack's `coverUrl`
- Same image is used for every row in the pack (the pack's own cover) — no per-track image generation
- `rounded-md` corners; `object-cover` to crop properly
- Falls back to the gradient class string for legacy non-image covers (the `isImageCover` boolean already used by the hero)

**Grid template change** — added a leading 40px column:
- Old: `[48px_1fr_180px_72px_56px_56px_120px]` (7 cols)
- New: `[40px_48px_1fr_180px_72px_56px_56px_120px]` (8 cols)

**Mobile** — on `< lg`, the grid is `grid-cols-1` and each cell stacks. The thumbnail is rendered inline with the play button + title in the first cell (alongside the existing mobile-only title block). On `lg+`, it occupies its own 40px leading column. Two thumbnail nodes (one `lg:hidden`, one `hidden lg:block`) — the duplication is intentional to keep mobile/desktop visuals correct without conditional rendering at the layout boundary.

**Final song table column order**
1. Cover (40px)
2. Play (48px)
3. Song (1fr)
4. Waveform (180px)
5. Duration (72px)
6. Price (56px)
7. Loved (56px)
8. Add to Cart (120px)

**Files modified**
- `src/app/pack/[id]/page.tsx`

---

### Session 7 — Trending Packs Sidebar: Self-Contained Scrollable Feed

**Problem**: The "Trending Packs" sidebar on the homepage used a dynamic-top JS sticky algorithm (drift with page, lock to viewport top/bottom). With the catalog growing to 64 packs (and arbitrary growth ahead), the sidebar grew taller than the main column, breaking the drift algorithm's containing-block math and producing visible gaps.

**Decision**: Replace the JS algorithm with a CSS-only sticky + internal-scroll feed. The sidebar pins to the viewport at `top: 80px`, caps its height at `calc(100vh - 96px)`, and the children scroll inside it. The scrollbar is hidden via `.scrollbar-hide`. When the inner feed reaches its end, native scroll-chaining lets the main page continue scrolling underneath while the sidebar stays locked.

**`src/components/StickySidebar.tsx` rewrite**
- All JS scroll handlers, refs, ResizeObserver, and rAF removed
- Pure CSS sticky pattern: `position: sticky` + `max-height` + `overflow-y: auto`
- Element changed from `<div>` to `<aside>` for semantic correctness
- `topOffset` and `bottomOffset` props retained, fed via CSS custom properties (`--ssb-top`, `--ssb-max-h`) so Tailwind responsive prefixes (`lg:`) apply cleanly
- `minWidth` prop removed — responsive activation now done via Tailwind's `lg:` breakpoint instead of imperative JS

**Why this matches x.com's invariant** — sidebar locks to the viewport, main page continues scrolling underneath, no layout shift, no item cap. The scroll *mechanism* differs from x.com (internal overflow vs. drift-with-page) but the user-visible behavior is identical AND it scales to an unbounded catalog, which the drift approach cannot.

**Files modified**
- `src/components/StickySidebar.tsx` (complete rewrite, ~135 lines → ~50 lines)

**Notes for future sessions**
- The `.scrollbar-hide` utility already exists in `globals.css` (lines 339–348) — Webkit + Firefox + IE
- Native scroll-chaining is the desired behavior; do NOT add `overscroll-behavior: contain` to the sidebar — that would prevent the main page from scrolling when the sidebar is at its end
- The wrapper in `src/app/page.tsx` (`<div className="w-full lg:w-[320px] lg:shrink-0">`) is still needed to set the column width; the parent `lg:items-stretch` is fine — sticky inside a stretched flex item works as expected

---

### Session 1 — Landing Page
- Fixed waitlist form (Google Apps Script endpoint, see memory)
- Added optimistic UI on form submit
- Fixed cursor (pointer missing on CTA button)
- Fixed social links
- Added genre marquee animation
- Removed duplicate `index.html` from repo root

### Session 6 — Wishlist Iconography Reverted to Heart; Column Headers Finalized

**User direction**: keep Heart icon for wishlist (not Bookmark). Reverted Session 5's icon change across all surfaces:
- `PackCard.tsx` pack-level save button → Heart, zesty-red active state
- `pack/[id]/page.tsx` hero pack-level save button → Heart, zesty-red active state
- `pack/[id]/page.tsx` per-song "Loved" column → Heart, zesty-red active state

**Final song table column headers** (single line, `whitespace-nowrap`):
1. Play
2. Song
3. Waveform
4. Duration
5. Price
6. Loved (heart icon, wishlist toggle)
7. License This (Add to Cart at ₹99)

Action button inside the "License This" column reads `License This` / `In Cart` / `Owned` to match the column header.

Grid template: `[48px_1fr_180px_72px_56px_56px_120px]`

**Files modified**
- `src/components/PackCard.tsx`
- `src/app/pack/[id]/page.tsx`

---

### Session 5 — Pack UI: License → Add to Cart, Heart → Bookmark, Per-Song Save

**Decision**: switched pack save iconography from `Heart` (affection) to `Bookmark` (utility/save). Saved state uses vivid-blue accent throughout, matching the primary brand color rather than zesty-red. Applies to:
- `PackCard.tsx` pack-level save button
- `pack/[id]/page.tsx` hero pack-level save button
- `pack/[id]/page.tsx` per-song save column (NEW)

**Song table on pack detail**
- Renamed last column header `License` → `Add to Cart`
- Action button labels now: `+ Add to Cart` (default) / `🛒 In Cart` / `Owned` (disabled)
- New column added between `Price` and `Add to Cart` for per-song bookmark
- Wired to `toggleTrackWishlist` + `isInWishlist(id, "track")` from store-context
- Grid template: `[48px_1fr_180px_72px_64px_44px_140px]` (7 columns now)

**Files modified**
- `src/components/PackCard.tsx`
- `src/app/pack/[id]/page.tsx`

---

### Session 4 — Packs UX Refinement: Strip Cards, Fix Dropdown, Remove Pack Pricing

**Pricing model decision** — packs are no longer purchasable. Songs are sold individually at a flat ₹99 each. This changes:
- All 12 base tracks in `mock-data.ts` now have `price: 99`
- Pack-level pricing (`pack.price`, `pack.originalPrice`) is no longer surfaced anywhere in the UI (the fields remain in the schema but are not rendered)
- "Get Pack" button removed from every component and route

**PackCard redesign**
- Stripped to: 1:1 artwork (full real estate), title, category tag, action row
- Action row: Preview button (→ detail) + Heart (wishlist) + Share + Chevron (expand)
- Description text and tag chip row removed from card body
- Title overlay on cover removed — moved below cover for cleaner artwork
- Hover state on cover: subtle gradient overlay + center play affordance

**Dropdown bug fix**
- Root cause: CSS Grid default `align-items: stretch` made all cells in a row match the height of the tallest cell. When one card expanded, sibling cards stretched too — looked like they all expanded
- Fix: `items-start` on the grid container in `packs/page.tsx`
- Per-card `useState(expanded)` was already correctly isolated; only the visual stretching was broken
- Expanded list is `max-h-72 overflow-y-auto` so even 50-track packs don't blow out the layout

**Pack detail page rebuild**
- The "top gap" was the hero box (`h-72 md:h-[380px]`) being empty because `pack.coverUrl` is now a file path (`/packs/pack-N.png`), but the code was applying it as a Tailwind gradient class (`bg-gradient-to-br /packs/pack-1.png` — invalid CSS)
- Replaced with side-by-side layout: 256px square album art on the left + title/badges/actions on the right
- Removed: Get Pack button, pack price, discount badge, track count metadata
- Song table columns: Play · Song · Waveform · Duration · Price · License (BPM column removed)
- Every song shows ₹99
- License action button: "Standard" / "In Cart" / "Owned"

**Cross-component cleanup of pack pricing/Get Pack**
- `TrendingDiscoveryPanel.tsx`: removed cart-add buttons, replaced with `<Link href="/pack/{id}">Open Pack</Link>`. Featured pack thumbnail and ranked-pack thumbnails now use `next/image` (the gradient-string fallback was broken for file paths). Track count + price subtext replaced with category.
- `app/page.tsx` (home): Featured Packs preview section now renders 1:1 album art, no price/originalPrice display, "Get Started" CTA changed to "Open Pack" linking to detail. Other packs row also uses `next/image` and shows category instead of "{trackCount} tracks".

**Files modified**
- `src/lib/mock-data.ts` (12 track prices → 99)
- `src/components/PackCard.tsx` (rewrite)
- `src/app/packs/page.tsx` (rewrite — no subtitle, no count badges, no stats banner, items-start grid)
- `src/app/pack/[id]/page.tsx` (rewrite — side-by-side hero, no BPM, ₹99, no pack pricing)
- `src/components/TrendingDiscoveryPanel.tsx` (no Get Pack, no pack pricing, real images)
- `src/app/page.tsx` (Featured Packs section cleanup, NextImage import)

---

### Session 3 — Real 64 Soundpacks Implementation

**Source data**: `keval-packs/ALBUM ARTS/` (64 PNG files, sequentially numbered) and `keval-packs/Sound PACKS LIST.pdf` (categorized song counts)

**Image asset pipeline**
- All 64 album arts copied to `public/packs/pack-{N}.png` (1–64) via PowerShell script
- Source folder `keval-packs/` is git-ignored (untracked); only the normalized public copies are committed

**Pack interface** — added `category: string` field to `Pack` in `src/lib/mock-data.ts`

**Mock data replacement**
- 12 fake packs removed from `src/lib/mock-data.ts`
- 64 real packs generated from a `packDefs[]` array via `.map()` to keep the file readable
- Pricing: 50-song packs ₹14,999 (orig ₹24,999); 25-song packs ₹7,499 (orig ₹12,999)
- Category counts: Commercial=9, Electronic=14, Bollywood=10, Indie=7, Culture=9, Occasion=14, Classic=1 (total 64)
- Featured packs: Pop, EDM/Dance, Classical, Hindi Electronic
- `expandPackTracks()` reused for placeholder track generation per pack

**PackCard.tsx** — major redesign
- Replaced fixed `h-36` gradient div with `aspect-square` `<Image>` from next/image
- Detects file path coverUrl (starts with `/`) vs gradient class string for backward compat
- Title + song count + price overlay positioned at bottom of cover with gradient mask
- Featured / Owned badges moved to top-left corner of cover
- Removed standalone description block on top of card body — now compact

**packs/page.tsx**
- Filter bar replaced with 7 real categories + "All" — each shows pack count badge
- Filter logic switched from `pack.genre` → `pack.category`
- Grid widened to 4 columns at `lg`: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Stats banner updated to 64 packs / 2,375 songs

**Files modified**
- `src/lib/mock-data.ts`
- `src/components/PackCard.tsx`
- `src/app/packs/page.tsx`
- `public/packs/pack-1.png` through `pack-64.png` (NEW, 64 files)

---

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
| `src/components/StickySidebar.tsx` | Session 7: rewritten as CSS-only sticky + internal-scroll feed (was: dynamic-top JS sticky) |
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
