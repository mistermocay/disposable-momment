# Rolla — Event Camera Landing Page

A frontend-only landing page for **Rolla**, a QR-based shared event camera concept
(no app required for guests, one shared album, scheduled reveal).

> The brand name used throughout is a placeholder: **Rolla**. To rename it,
> find-and-replace `Rolla` across `index.html` (title, navbar logo, footer logo).

## Project structure

```
rolla-landing/
├── index.html    → all markup, all 12 sections, semantic HTML5
├── style.css     → design tokens (colors/type/radius), layout, animations
├── script.js     → mobile nav, scroll-in animation, FAQ accordion,
│                   inline icon injection, reveal countdown demo
└── README.md     → this file
```

## Run it locally

No build step, no dependencies to install. Any of these work:

**Option A — just open it**
Double-click `index.html`, or drag it into your browser.

**Option B — local server (recommended, avoids any browser file:// quirks)**
```bash
cd rolla-landing
python3 -m http.server 8000
# then open http://localhost:8000
```
or, with Node installed:
```bash
npx serve .
```

## What's wired vs. placeholder

- `Create Event` / `Create Your Event` buttons point to `/create-event`
- `Sign In` points to `/login`
- Guest flow mockups reference `/event/[eventId]` and `/gallery/[eventId]` conceptually — no real routing exists yet, since this is frontend-only
- The reveal countdown timer is a **visual demo only** (loops automatically) — connect it to a real event timestamp when the backend exists
- Photo imagery is CSS gradients, not real photos — swap `.photo-card__img--*`, `.use-case-card__visual--*`, and `.phone-mock__viewfinder` background rules in `style.css` for real images later
- No backend, auth, database, upload, or admin dashboard is included, per scope

## Design notes

- Palette: warm off-white background (`#FAF9F6`), ink black (`#111111`), warm amber accent (`#E8A33D`) with a deeper "darkroom red" (`#C1432A`) used sparingly for emphasis and the reveal section
- Type: Space Grotesk (display), Inter (body), JetBrains Mono (frame counters, timestamps, labels — a nod to film frame numbering)
- Signature element: a film-sprocket rail running down the left edge of the page on desktop, and frame-numbered labels ("FRAME 01–04") instead of generic step numbers
- Fully responsive, mobile-first; `prefers-reduced-motion` disables scroll/float/pulse animations
