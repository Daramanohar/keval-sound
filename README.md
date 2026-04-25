# Keval Sound — Landing Page

Static HTML landing page for Keval Sound.

## Local preview
Open `index.html` directly, or serve with any static server:
```bash
npx serve .
```

## Deploy on Vercel
1. Push this folder to your repo.
2. On Vercel: **New Project** → import `Daramanohar/keval-sound`.
3. **Root Directory** → click *Edit* → select **`landing-page`**.
4. **Framework Preset** → *Other* (static).
5. **Deploy**.

## Structure
```
landing-page/
├── index.html        # Main landing page
├── assets/           # Videos, posters, logo SVGs
└── vercel.json       # Static hosting config (caching)
```

## Notes
- Videos are full-bleed and autoplay muted; preserve `autoplay muted loop playsinline` on `<video>` tags.
- Long-cache headers are set on `/assets/*` (immutable, 1 year). HTML is no-cache so updates ship instantly.
