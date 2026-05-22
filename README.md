# Depths — Sea Creatures Cinematic

Interactive ocean exhibit: 3D specimen gallery, story panels, ocean passport, and craft links (puzzles & crochet) for each creature. Bilingual EN/ES.

**Live site:** https://appvantixai.github.io/sea-creatures-cinematic/

## Run locally

```bash
cd sea-creatures-cinematic
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). **Do not open `index.html` via `file://`** — YouTube embeds require `http://` or `https://`.

Alternative: `python3 -m http.server 4173` then visit the same URL.

## Deploy

| Platform | Notes |
|----------|--------|
| **GitHub Pages** | Push to `main`; [`.github/workflows/pages.yml`](.github/workflows/pages.yml) deploys automatically. |
| **Netlify** | `netlify.toml` included. |
| **Vercel** | `vercel.json` included; static root `.` |
| **Any static host** | Serve `index.html` over HTTPS. |

## Test

```bash
npm install playwright@1.60.0
npx playwright install chromium
npm run dev &
BASE_URL=http://127.0.0.1:4173/ node test.mjs
```

## Controls

- **Gallery** — pick a specimen; open story from the card or dock button
- **Ocean passport** — stars appear after you open each story
- **Makes tab** — puzzle and crochet links per creature
- **ES** — Spanish UI
