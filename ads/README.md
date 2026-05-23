# Side banner assets

Real brand logos and product imagery used in the Y2K “Advertisement” rails. Files are hosted in-repo so GitHub Pages does not depend on hotlinked third-party URLs.

- **Desktop (960px+):** fixed left/right side rails
- **Mobile (&lt;960px):** horizontal scroll strip under the passport bar

## Sources

| File | Subject | Source |
|------|---------|--------|
| `sea-monkeys.jpg` | Sea-Monkeys in aquarium | [Wikimedia Commons — SeaMonkiesInAquarium.JPG](https://commons.wikimedia.org/wiki/File:SeaMonkiesInAquarium.JPG) (public domain) |
| `aol-classic.png` | AOL wordmark | [Commons — 1byaollogo.png](https://commons.wikimedia.org/wiki/File:1byaollogo.png) |
| `aol.png` | AOL logo (alternate) | [Commons — AOL old logo.svg](https://commons.wikimedia.org/wiki/File:AOL_old_logo.svg) |
| `animal-planet.png` | Animal Planet | [Commons — Animal Planet logo.svg](https://commons.wikimedia.org/wiki/File:Animal_Planet_logo.svg) |
| `natgeo.png` | National Geographic Channel | [Commons — National Geographic Channel.svg](https://commons.wikimedia.org/wiki/File:National_Geographic_Channel.svg) |
| `neopets.png` | Neopets | [Wikipedia — Neopets logo 2024.png](https://en.wikipedia.org/wiki/File:Neopets_logo_2024.png) |
| `ie.png` | Internet Explorer | [Commons — Internet Explorer logo for Windows 7.jpg](https://commons.wikimedia.org/wiki/File:Internet_Explorer_logo_for_Windows_7.jpg) |
| `ebay.png` | eBay | [Commons — EBay logo.svg](https://commons.wikimedia.org/wiki/File:EBay_logo.svg) |
| `freddi-humongous.png` | Humongous Entertainment (Freddi Fish publisher) | [Commons — Humongous Entertainment logo.svg](https://commons.wikimedia.org/wiki/File:Humongous_Entertainment_logo.svg) |
| `britannica.png` | Encyclopædia Britannica | [Commons — 1911 Britannica logo.png](https://commons.wikimedia.org/wiki/File:1911_Britannica_logo.png) |
| `pogo.png` | Pogo.com | [Commons — Pogo.com Logo.svg](https://commons.wikimedia.org/wiki/File:Pogo.com_Logo.svg) |

Logos may be trademarked by their respective owners. This exhibit uses them only as period-accurate decorative “sponsor” banners linking to official sites, not as endorsement.

## Replacing assets

Drop in new images with the same filenames, or update `data-asset` / `src` on the banner `<img>` tags in `index.html` (paths are resolved via `assetUrl()` for custom domain, localhost, and legacy GitHub Pages). Keep images under ~120px wide for the side rails.
