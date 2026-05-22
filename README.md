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
- **🎵** — optional background music (Freddi Fish *Missing Kelp Seeds* intro); off by default, preference saved in the browser
- **🔊** — UI sound effects (separate from music and video)
- **ES** — Spanish UI

### Mobile (under 960px)

- **Tap a card** to preview the specimen, then **Open Story** on the sticky bar (no duplicate desktop dock)
- Horizontally scrollable **ocean passport**; progress ring and count above the gallery
- Full-screen story panel with larger touch targets; loader and audio controls match desktop

### Background music file

Place your licensed copy of the intro as [`audio/freddi-intro.mp3`](audio/README.md). Without that file, the site falls back to a YouTube no-cookie stream. See [`audio/README.md`](audio/README.md).
