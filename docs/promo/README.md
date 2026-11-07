# Lab promo assets

| Asset | Use |
| --- | --- |
| `poster.html` | IMMSPFEE Lab A4 briefing (synced from repo-root `poster.html`) |
| `poster-standalone.html` | Same Lab sheet; relative paths for `docs/promo/` |
| `immspfee-lab-a4.pdf` | Print PDF (`npm run poster:pdf`) |
| `poster-a4-*.png` | Print smoke shots (`npm run test:poster`) |
| `lab-qr.svg` | Optional QR for other promo uses (`npm run gen:lab-qr`) — **not** on the A4 poster |
| `micro-webkit-3d.png` | Microscope WebGL still (docs / shots — **not** on the A4 poster) |
| `shell-projector-1000.png` / `shell-projector-1000-overlay.png` | Projector chassis stills for docs |
| `micro-*.png` | Other microscope shell reference stills |

## Poster design

Typography + wordmark only (no stage still, no QR image). Academic / #evenbetterposter practice:

- One take-home **claim sentence**
- Ample whitespace; no bordered cards
- Phrases, not paragraphs; ≤2 typefaces (Sora + IBM Plex Mono)
- Stamped URL text once (`?v=` from `asset-stamp.json`)

- Root: [`/poster.html`](../../poster.html) · Promo: [`poster.html`](./poster.html)
- Language: `?lang=en` (default) · `?lang=zh` · `?lang=both`
- Print: Scale 100%, margins none, A4 portrait
- Sync after editing the root sheet: `npm run sync:poster`

Tracked so GitHub Pages can deep-link them (CI `shots/` is gitignored / rsync-excluded).
