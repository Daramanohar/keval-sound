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
├── contact/          # Public Contact Us page
├── legal/            # Stripe-facing legal and policy PDFs
├── assets/           # Responsive WebP backdrops and brand assets
└── vercel.json       # Static hosting config (caching)
```

## Notes
- Landing backdrops use responsive desktop/mobile WebP images to keep the page usable on slower networks.
- The hero image loads with high priority; below-the-fold section images lazy-load.
- Long-cache headers are set on `/assets/*` (immutable, 1 year). HTML is no-cache so updates ship instantly.
