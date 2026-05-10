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

### Session 15 — Hamburger Sidebar Toggle, Page-Width Gap Fix, Genre-Only Filter (25 PDF Buckets)

Three user-driven UX fixes shipped in one push. All changes scoped to keep the home page (`/`) untouched per explicit user direction.

**Fix 1 — Sidebar toggle reworked into a TopBar hamburger**

The previous floating chevron button at `right-[-14px]` on the sidebar was clipped in half by the browser because the `<aside>` had `[contain:layout_paint]` — paint containment clips anything painted outside the element's box. Replaced the entire affordance with the standard Notion/Linear/Slack pattern: hamburger button at the top-left of the TopBar.

- `src/components/Sidebar.tsx`:
  - Removed the floating chevron button (lines that lived at `right-[-14px] top-[72px]`)
  - Removed `[contain:layout_paint]` from the `<aside>` className (root cause of the clip)
  - Removed `onToggleCollapse` from `SidebarProps`; removed the `ChevronLeft` import
- `src/components/TopBar.tsx`:
  - Hamburger button is no longer `lg:hidden` — visible on every breakpoint
  - Icon swaps `Menu` ↔ `X` via `AnimatePresence` (`mode="wait"`, 150ms rotate+scale crossfade) so the open/closed state is unmistakable
  - New `sidebarCollapsed` and `mobileOpen` props feed accurate `aria-label` / `aria-expanded` (collapse-vs-expand on desktop, open-vs-close on mobile)
- `src/components/AppShell.tsx`:
  - One `handleMenuToggle` branches on `window.innerWidth >= 1024`: ≥1024 toggles `sidebarCollapsed`; <1024 toggles `mobileSidebarOpen`. Single button, two contexts.
  - Bonus: fixed the pre-existing `react-hooks/set-state-in-effect` lint error by hoisting the localStorage read into a `useState` lazy initializer (also eliminates first-paint width flash). The `useEffect` + `setSidebarCollapsed(true)` block is gone.

**Fix 2 — Killed the page-width gap on every non-home route**

The dark vertical strip between the sidebar and content (visible on a 1920px monitor) was caused by `mx-auto max-w-7xl` on page wrappers. With sidebar collapsed (76px) and main padded `px-6`, the available width was ~1820px while content was capped at 1280px and centered — leaving ~270px of dead space on each side.

Dropped `mx-auto max-w-7xl` from page wrappers (and the redundant per-page `px-6` where AppShell already provides it):
- `src/app/packs/page.tsx` (2 wrappers)
- `src/app/explore/page.tsx` (2 wrappers)
- `src/app/account/page.tsx` (1 wrapper)
- `src/app/cart/page.tsx` (1 wrapper)
- `src/app/samples/page.tsx` (2 wrappers)
- `src/app/pack/[id]/page.tsx` (was `max-w-6xl`, now empty `<div>`)

Pages now fill width inside AppShell's standard `px-6` (24px) horizontal padding. Home (`/`) intentionally untouched per user direction. `/song/[id]` keeps its `max-w-4xl` cap deliberately for lyrics + comments readability — flag for future review if user wants it dropped.

**Fix 3 — Explore filter stripped to Genre-only with the 25 PDF buckets**

Source of truth: `GENRES.pdf` at repo root. The 25 canonical genres are: HINDI/BOLLYWOOD, POP, HIP-HOP/RAP, EDM, ROCK, LO-FI, R&B/SOUL, PHONK, AMBIENT, TECHNO, SYNTHWAVE, METAL, COUNTRY, ACOUSTIC, HYPERPOP, DEVOTIONAL/SPIRITUAL, FOLK, CLASSICAL INDIAN, KOREAN, MIDDLE EASTERN, REGGAE, FUNK/DISCO, DARKWAVE, VAPORWAVE, FUTURE GARAGE.

- `src/lib/mock-data.ts`:
  - Replaced `genres` export with the 25-entry list (with `"All Genres"` prepended for the filter default)
  - **Remapped every track's `.genre` to a PDF bucket** so filters return real results:
    - `Bollywood Trap → HINDI/BOLLYWOOD`, `Folk Fusion → FOLK`, `South Indian EDM → EDM`, `Bhangra Pop → POP`, `Psytrance → TECHNO`, `Lo-fi Bengali → LO-FI`, `Desi Drill → HIP-HOP/RAP`, `Tropical House → EDM`, `Indian Hip Hop → HIP-HOP/RAP`, `Ambient Folk → AMBIENT`, `Drum & Bass → EDM`, `Garba EDM → EDM`
    - All 6 BOLLY V1 demo packs (36 songs total): every Hindi-* sub-genre → `HINDI/BOLLYWOOD`
  - **Deleted** the now-orphaned `moods`, `regions`, `keys`, `bpmRanges` exports (no consumers remained)
- `src/components/FilterPanel.tsx` (rewrite, ~170 lines → ~65 lines):
  - `FilterState` is now `{ genre: string }` only
  - Removed `FilterSection` collapsible component, the `useState` open-state, `AnimatePresence`, `ChevronDown`
  - Single flex-wrap row of genre chips; `"All Genres"` renders as `"All"`
- `src/app/explore/page.tsx`:
  - `filteredTracks` `useMemo` now only checks `track.genre` — Mood/Region/Key/BPM clauses removed
  - Search bar still searches across all metadata fields (title, artist, genre, mood, region, language, tags) — only the *filter UI* lost the non-genre dimensions

**Files modified (total: 11)**

| File | Change |
|---|---|
| `src/components/Sidebar.tsx` | Remove edge-chevron toggle + `contain:layout_paint`; drop `onToggleCollapse` prop |
| `src/components/TopBar.tsx` | Hamburger always visible; Menu↔X animated swap; new `sidebarCollapsed`/`mobileOpen` props |
| `src/components/AppShell.tsx` | Unified `handleMenuToggle` (viewport-branched); localStorage moved to `useState` initializer |
| `src/components/FilterPanel.tsx` | Stripped to genre-only |
| `src/lib/mock-data.ts` | 25-genre PDF list; remap all track genres; delete orphan exports |
| `src/app/explore/page.tsx` | Drop max-w-7xl; genre-only filter logic |
| `src/app/packs/page.tsx` | Drop max-w-7xl |
| `src/app/account/page.tsx` | Drop max-w-7xl + redundant px-6 |
| `src/app/cart/page.tsx` | Drop max-w-7xl + redundant px-6 |
| `src/app/samples/page.tsx` | Drop max-w-7xl + redundant px-6 |
| `src/app/pack/[id]/page.tsx` | Drop max-w-6xl |

Net diff: **+137 / −229** (less code).

**Verification**
- `npm run lint` — clean (also resolved the pre-existing `react-hooks/set-state-in-effect` error)
- `npx tsc --noEmit` — clean
- `npm run build` — clean, all 10 routes generated

**Notes for future sessions**
- The hamburger viewport branch uses `window.innerWidth >= 1024` (matches Tailwind `lg:`). If the breakpoint changes, update `AppShell.handleMenuToggle` *and* the `lg:pl-[76px]` / `lg:pl-[248px]` rules together — they must agree.
- `FilterState` is now type-narrow (`{ genre: string }`). If you reintroduce a Mood/Key filter later, extend `FilterState` and update both `defaultFilters` and the explore page's `filteredTracks` predicate.
- The 25-genre list lives in **two** places that must stay in sync: `GENRES.pdf` (source of truth) and `genres` export in `mock-data.ts`. If the PDF is updated, mirror the changes here.
- Track `genre` field is now case-sensitive and uppercase (e.g. `"HIP-HOP/RAP"`). Anything that displays the genre string verbatim (e.g. `MusicCard`, `TrackCard`) will show it in caps — that matches the chip filter aesthetic, but if a future pass wants Title Case display, do the cosmetic transform at render time, not in the data.
- The `final.fix.md` document at the repo root is **stale** (predates Sessions 3–14). Most of its fixes are already shipped or superseded. Do not paste it as a brief; rebuild the fix list from real code state.

---

### Session 14 — Phases B/C/D/E: Sidebar Gap, Song Detail Drawer, Suno Player Bar, /song/[id] Route

Shipped four phases in one push, completing the Suno-inspired song experience.

**Phase B — Sidebar gap fix**
- `src/app/pack/[id]/page.tsx`: dropped `mx-auto` from the page-root `<div className="mx-auto max-w-6xl">`. Content now left-aligns flush against the sidebar (modulo `AppShell`'s `px-6`), eliminating the dead space on wide viewports. `max-w-6xl` retained for readability cap on the right.

**Phase C — Right-side song detail drawer**
- `src/lib/song-detail-context.tsx` (new): tiny global context, `{ opened, isOpen, openSong(track, pack), close }`
- `src/components/SongDetailDrawer.tsx` (new): backdrop + slide-from-right `<aside>` (Framer spring), keyed on `opened.track.id` so each open re-mounts cleanly
- Lyrics fetched lazily from `track.lyricsUrl` via `fetch()`; initial state covers the no-URL case so no synchronous setState happens inside the effect (lint-compliant)
- Action grid: Add to Cart (₹99), Save to Crate (toast — Phase 2), Share (copies `/song/<id>` link)
- Provider mounted in `src/app/layout.tsx` between `PlayerProvider` and `AppShell`; drawer rendered alongside `PersistentPlayer`
- Trigger: clicking the song title block on the pack detail row calls `openSong(track, pack)` (both desktop and mobile)
- Escape closes; backdrop click closes

**Phase D — Suno-style player bar**
- `src/components/PersistentPlayer.tsx`: replaced the right cluster (was just volume + close) with a richer affordance row
- Added: Queue (toast), Save (Heart, wired to `toggleTrackWishlist`), Dislike (toast), Comment (toast), Share (copies `/song/<id>`), Volume slider, **Info** (opens drawer for current track), Close
- Info button is the headline: resolves `currentItem.id` back to `Track` + `Pack` via a local `findTrackContext` helper, then `openSong(track, pack)`
- New `PlayerIconButton` helper at the bottom of the file — consistent 32×32 hit target with hover/active treatments
- Mobile: most icons hidden via `md:flex` / `lg:flex` so the bar still fits on phones; Info + close stay always-visible

**Phase E — `/song/[id]` route**
- `src/app/song/[id]/page.tsx` (new): full standalone song page mirroring the drawer but with comments
- Hero: 320px cover, large title, artist, "From {pack}" link, play count + meta, full action row (Play/Pause, Add to Cart, Heart, Crate, Share)
- Lyrics: fetched from `track.lyricsUrl`, same pattern as the drawer
- Comments: `localStorage`-backed list (`keval:comments:<trackId>`). Form posts `{ id, text, authorName, createdAt }`; relative time helper inline
- Author name pulled from `useAuth().user.name`; falls back to "Anonymous"

**New trigger surfaces (drawer)**
1. Pack detail row title click
2. Player bar Info button (current track)
3. Direct `/song/[id]` route also exists for permalink/share flow (doesn't use drawer — it's the full-page version)

**Files modified**
- `src/app/pack/[id]/page.tsx` (gap fix + title-click → drawer trigger)
- `src/components/PersistentPlayer.tsx` (right cluster rewrite)
- `src/app/layout.tsx` (provider + drawer mount)

**Files added**
- `src/lib/song-detail-context.tsx`
- `src/components/SongDetailDrawer.tsx`
- `src/app/song/[id]/page.tsx`

**Notes for future sessions**
- The lyrics-fetch pattern in both `SongDetailDrawer` and `/song/[id]` deliberately uses initial state to cover the "no URL" branch — synchronous setState in `useEffect` triggers `react-hooks/set-state-in-effect`. If you add another lyrics consumer, follow the same pattern
- `findTrackContext(playableId)` in `PersistentPlayer.tsx` searches every `pack.tracks` array. Cheap for 64 packs but if the catalog grows large this should be memoized into a `Map<id, {track, pack}>` at module load
- Comments are LS-only and stored per-trackId. When a real backend lands, swap the `useEffect` LS hydration + `persistComments` calls for API requests; the rest of the form flow is reusable

---

### Session 13 — Phase A: Wire 6 Demo BOLLY V1 Packs With Real Audio + Lyrics

Foundational data layer for the upcoming Suno-style song-detail experience. The 6 demo BOLLY V1 packs now play real MP3s and have real lyrics text available for the right-side detail drawer (Phase C, not yet built).

**Source → public mapping**

| Source folder (gitignored) | Maps to | Songs |
|---|---|---|
| `BOLLY DANCE V1` | pack-27 (Hindi Dance) | 4 |
| `BOLLY ELECTRO V1` | pack-24 (Hindi Electronic) | 13 |
| `BOLLY HIP HOP V1` | pack-29 (Hindi Hip-Hop) | 5 |
| `BOLLY POP V1` | pack-28 (Hindi Pop) | 3 |
| `BOLLY ROCK V1` | pack-26 (Hindi Rock) | 5 |
| `BOLLY ROMANCE V1` | pack-25 (Hindi Romance) | 6 |
| | **Total** | **36 songs** |

**Asset pipeline**
- `scripts/import-demo-packs.mjs` slugifies each `<title>.mp3` → ASCII-only kebab-case, copies the audio to `public/audio/<pack-id>/<slug>.mp3` and lyrics to `public/lyrics/<pack-id>/<slug>.txt`
- Strips Devanagari from filenames but keeps it in display titles (later normalized to ASCII-only display)
- Re-runnable: when new demo packs land, drop them in the source folder and re-run `node scripts/import-demo-packs.mjs > scripts/.demo-songs.snippet.ts` and paste the snippet
- `MDATA.txt` files are intentionally **never** referenced anywhere — internal-only per spec

**Schema change**
- `Track` interface gained `lyricsUrl?: string` — fetched lazily by the upcoming song-detail drawer (Phase C). Optional so non-demo placeholder tracks remain valid

**Pack builder**
- New helper `buildDemoPackTracks(packId, packCoverUrl, packTags)` maps the demo song list into full `Track` objects, deterministic BPM/key rotation for variety, real `audioUrl` + `lyricsUrl`, all sharing the pack's cover art
- `packs` builder now does: `demoTracks.length > 0 ? demoTracks : expandPackTracks(...)` — placeholder packs unchanged, demo packs use real songs
- Demo packs' `trackCount` now reflects **actual song count** (3-13), not the marketing 50. Per spec: "for now the demo packs contain fewer songs than the full count, and that is acceptable for testing purposes"
- Player works automatically: `player-context` already feeds `currentItem.audioUrl` to a real `<audio>` element

**Repo size impact**
- `public/audio/` ≈ **128 MB** (committed straight per user direction — fastest path for MVP)
- `public/lyrics/` ≈ **160 KB**
- `keval-packs/` source folder added to `.gitignore` (was already untracked but now formalized)
- `scripts/.demo-songs.snippet.ts` gitignored — it's intermediate stdout

**Files modified**
- `src/lib/mock-data.ts` — `Track` schema + demo data + builder
- `.gitignore` — exclude source assets and intermediate snippet
- `scripts/import-demo-packs.mjs` (new)
- `public/audio/pack-{24..29}/` (new, 36 mp3s)
- `public/lyrics/pack-{24..29}/` (new, 36 txt files)

**Next**: Phase B (sidebar gap), Phase C (right-side drawer with lyrics), Phase D (Suno player bar), Phase E (`/song/[id]` route).

---

### Session 12 — Pack Detail: Refine Hover Overlay to Match YouTube Music Exactly

Session 11 left a permanent dark scrim and a floating play triangle on every row even at rest, plus a 1.05 scale-up on hover. Per direct YouTube Music reference, the thumbnail at rest should display **clean image only** — overlay appears only on hover (or always on touch).

**Changes to the merged thumbnail-button**

- **Rest state**: `opacity-0` on the overlay → image displays unmodified
- **Hover**: overlay fades in over 200ms — `bg-black/45` scrim + a 28px white circle containing a small dark play triangle, centered. Matches the YT Music chip
- **Touch devices** (`@media (hover: none)`): overlay stays visible always (no hover affordance on touch — keeps the play target obvious)
- **Playing**: `PlayingOverlay` (3 animated bars) replaces the icon, unchanged from Session 9
- **Image scale-up removed** — Session 11's `group-hover/cover:scale-105` was a structural change to the artwork; spec said overlay-only

**Files modified**
- `src/app/pack/[id]/page.tsx`

**Notes**
- The arbitrary variant `[@media(hover:none)]:opacity-100` is Tailwind v4's syntax for at-rule modifiers — works without any config change
- White circle is 28px (`h-7 w-7`) with `shadow-lg` and `bg-white`; play triangle inside is `h-3.5 w-3.5`, `fill-vampire-black`, `ml-0.5` for optical centering. These three rules together produce the exact YT Music affordance

---

### Session 11 — Pack Detail: Merge Cover Thumbnail + Play Button (YouTube Music Pattern)

The song-row layout had a 40px cover thumbnail in column 1 and a separate 48px circular play button in column 2 — visually busy and double-clickable for the same intent. Replaced with the YouTube Music pattern: the cover thumbnail itself is the play button, with a `Play` icon overlaid on a subtle scrim that intensifies on hover. While the track is playing, the existing `PlayingOverlay` (animated waveform bars) replaces the icon — same component, no duplication.

**Grid template** — dropped from 9 to 8 columns:
- Old: `[40px_48px_1fr_180px_72px_56px_56px_120px_40px]`
- New: `[48px_1fr_180px_72px_56px_56px_120px_40px]`

The leading column grew from 40px to 48px since it's now the click target — meets the 44px+ touch-target guideline. Header label "Play" was removed (the column has no header now since the icon is self-explanatory; `aria-hidden` placeholder kept for grid alignment).

**Hover/state matrix** on the merged thumbnail:
- Inactive: `bg-black/30` scrim + small white play triangle
- Hover: scrim deepens to `bg-black/55`, image scales `1.05` for a subtle "lift"
- Playing: `PlayingOverlay` (3 white bars pulsing) — replaces the play icon
- Click: toggles `toggleTrack(track, { queue: pack.tracks, pack })`

**Mobile** — same pattern. The first grid cell still hosts `cover/play + title` in a flex row on `< lg`, but it's now one button instead of two separate elements.

**Files modified**
- `src/app/pack/[id]/page.tsx`

---

### Session 10 — Persistent Player: Show Real Pack Art Instead of Generic Music Icon

The bottom player bar's left-side thumbnail was rendering `bg-gradient-to-br /packs/pack-N.png` — the same Tailwind-class-string-applied-to-a-file-path bug that Session 4 fixed elsewhere. So every song that originated in a pack showed a generic orange gradient + Music icon instead of the actual pack artwork.

**Two-line root-cause fix**

1. `src/lib/player-context.tsx` (`toPlayableTrack`): the player item's `coverUrl` now prefers `pack?.coverUrl ?? track.coverUrl`. Every track in a pack shares the same pack art, so when a pack is supplied at play time, the player carries the real image forward instead of the legacy track gradient class.

2. `src/components/PersistentPlayer.tsx`: detect file-path covers (`startsWith("/")`) and render `<Image>` from `next/image` (40×40, `rounded-lg`, `object-cover`). Gradient-class covers still fall through to the existing gradient div + Music icon, so non-pack contexts (e.g., samples) are unaffected.

**Files modified**
- `src/lib/player-context.tsx`
- `src/components/PersistentPlayer.tsx`

---

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
