# Lab promo assets

| Asset | Use |
| --- | --- |
| `poster.html` | IMMSPFEE Lab A4 briefing (synced from repo-root `poster.html`) |
| `poster-standalone.html` | Same Lab sheet; relative paths for `docs/promo/` |
| `immspfee-lab-a4.pdf` | Print PDF (`npm run poster:pdf`) |
| `poster-a4-*.png` | Print smoke shots (`npm run test:poster`) |
| `lab-qr.svg` | QR on the A4 poster (`npm run gen:lab-qr`, stamped `?v=`) |
| `micro-webkit-3d.png` | Microscope WebGL still (docs / shots — **not** on the A4 poster) |
| `shell-projector-1000.png` / `shell-projector-1000-overlay.png` | Projector chassis stills for docs |
| `micro-*.png` | Other microscope shell reference stills |

## Poster design

Claim-first A4: logo + QR only as images (no stage stills). Quiet pillars / rules; claim stays dominant.

- Brand clearspace: sheet padding top/left **≥14mm**
- Screen desk: white (no gray “dirty edge”)
- Language: `?lang=en` (default) · `?lang=zh` · `?lang=both` (bilingual kept)
- Sync: `npm run sync:poster` · assert: `npm run assert:poster`

Root: [`/poster.html`](../../poster.html) · Promo: [`poster.html`](./poster.html)
