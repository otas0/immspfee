# Lab promo assets

| Asset | Use |
| --- | --- |
| `poster.html` | IMMSPFEE Lab A4 briefing (synced from repo-root `poster.html`) |
| `poster-standalone.html` | Same Lab sheet; relative paths for `docs/promo/` |
| `immspfee-lab-a4.pdf` | Print PDF (`npm run poster:pdf`) |
| `poster-a4-*.png` | Print smoke shots (`npm run test:poster`) |
| `lab-qr.svg` | QR → Pages entry with `?v=` from `asset-stamp.json` (`npm run gen:lab-qr`) |
| `micro-webkit-3d.png` | Poster stage still (microscope WebGL) |
| `shell-projector-1000.png` / `shell-projector-1000-overlay.png` | Projector chassis stills for docs |
| `micro-*.png` | Other microscope shell reference stills |

## Poster

- Root: [`/poster.html`](../../poster.html) · Promo: [`poster.html`](./poster.html)
- Language: `?lang=en` (default) · `?lang=zh` · `?lang=both`
- Print: Scale 100%, margins none, A4 portrait
- Sync promo copies after editing the root sheet: `npm run sync:poster`

These PNGs / HTML are tracked so GitHub Pages can deep-link them (CI `shots/` is gitignored / rsync-excluded).
