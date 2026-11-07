# Lab promo assets

| Asset | Use |
| --- | --- |
| `poster.html` | IMMSPFEE Lab A4 briefing (synced from repo-root `poster.html`) |
| `poster-standalone.html` | Same Lab sheet; relative paths for `docs/promo/` |
| `immspfee-lab-a4.pdf` | Print PDF (`npm run poster:pdf`) |
| `poster-a4-*.png` | Print smoke shots (`npm run test:poster`) |
| `lab-qr.svg` | QR → Pages entry with `?v=` from `asset-stamp.json` (`npm run gen:lab-qr`) |
| `micro-webkit-3d.png` | Poster evidence figure (microscope WebGL) |
| `shell-projector-1000.png` / `shell-projector-1000-overlay.png` | Projector chassis stills for docs |
| `micro-*.png` | Other microscope shell reference stills |

## Poster design

Layout follows academic / #evenbetterposter practice (Morrison #betterposter + MIT Comm Lab + Argonne / Karolinska):

- One take-home **claim sentence** (dominant)
- One **evidence figure** (cropped instrument; no UI caption chrome overlay)
- Ample whitespace; no bordered cards; logo small, away from the claim
- Phrases, not paragraphs; ≤2 typefaces (Sora + IBM Plex Mono)
- QR + URL once

- Root: [`/poster.html`](../../poster.html) · Promo: [`poster.html`](./poster.html)
- Language: `?lang=en` (default) · `?lang=zh` · `?lang=both`
- Print: Scale 100%, margins none, A4 portrait
- Sync after editing the root sheet: `npm run sync:poster`

Tracked so GitHub Pages can deep-link them (CI `shots/` is gitignored / rsync-excluded).
