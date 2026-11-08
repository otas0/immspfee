# Catalog 2D structure vs dedicated WebGL shell

Same optics engine (`js/models/microscopeOptics.js` · Hecht finite tube · Abbe `d = 0.61 λ / NA`). Different chrome only.

```
┌──────────────────────── Catalog (Lab Classic) ────────────────────────┐
│  ┌─ 3D stage (isolated strip, above every domain) ─────────────────┐  │
│  │  Compound microscope · 3D  →  enter lab-microscope3d            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  Sidebar domains…    │  2D Canvas structure + rays  │  Param bench     │
│  物理 ▸ 光学 ▸ r016  │  turret / eyepiece picks     │  full schema     │
│  (catalog 2D only)   │  onPointer → objective/eye   │  speed · trail…  │
│                      │  HUD cards from getReadouts  │                 │
└───────────────────────────────────────────────────────────────────────┘
                3D strip / ?shell=  ──enter──▶  lab-microscope3d
                ◀──exit──  Back to catalog (expand 物理/光学 · highlight r016)

┌──────────────────── Dedicated shell (lab-microscope3d) ───────────────┐
│  IMMSPFEE brand row · Back to catalog only (no full catalog list)     │
│  ┌──────────────────────────────────────────┬───────────────────────┐ │
│  │  WebGL structure (orbit + turret hits)   │  Optical rail         │ │
│  │  drag orbit · wheel zoom                 │  objective / eyepiece │ │
│  │  click objectives · eyepiece chips       │  L / NA / λ / oil     │ │
│  │  L dimension label · oil iff immersion   │  “edited” from optics │ │
│  │                                          │  fingerprint (live)   │ │
│  ├──────────────────────────────────────────┴───────────────────────┤ │
│  │  Fixed readouts: M · f_obj · NA · d_Abbe  (not generic HUD)      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  CSS: css/microscope-shell.css (fingerprinted) · bench/HUD hidden     │
└───────────────────────────────────────────────────────────────────────┘
```

| Concern | Catalog 2D (`r016` row) | Independent WebGL shell |
| --- | --- | --- |
| Params source | `state.params` via `opticsFromParams` | Same |
| Stage | `#canvas` structure sketch | `#canvas-webgl` only |
| Controls | Full `paramSchema` bench | `#micro-rail` optical keys only |
| Readouts | Generic HUD cards | Four `#micro-metric` cells |
| Shell picker | Classic / Focus / Projector | Single “Back to catalog” |
| Entry | Sidebar domain row (stays Lab Classic) | Left-bar **3D stage** strip, or `?shell=lab-microscope3d` |

Selecting the normal `r016-显微镜` catalog row must **not** auto-enter WebGL. See `docs/microscope-isolation.md`.

## Interactions (WebGL shell)

| Input | Effect | Optics source |
| --- | --- | --- |
| Drag on `#canvas-webgl` | Orbit yaw/pitch (pointer capture) | view only |
| Wheel | Zoom radius | view only |
| Click objective nose | Set `params.objective` + turret defaults | `opticsFromParams` → M/NA/d_Abbe |
| Click eyepiece chip (5×/10×/15×) | Set `params.eyepiece` | same |
| Rail sliders / chips | L, NA, λ, immersion | same; rail “edited” chip shows live M / d_Abbe delta vs baseline |
| Esc | Close rail if open, else leave shell | — |
| PNG shot | `preserveDrawingBuffer` + `capturePng` + composite L/eyepiece DOM labels | framebuffer + overlay |

2D catalog `r016` and 3D shell must agree on **M**, **NA**, and **d_Abbe** for the same `params` (same `opticsFromParams`). Compare readouts side-by-side when auditing; do not invent display numbers.

### Lab-manual readout compare shots

| View | File |
| --- | --- |
| Catalog 2D `r016` HUD | [docs/promo/micro-2d-r016.png](./promo/micro-2d-r016.png) |
| WebGL 3D metrics | [docs/promo/micro-3d-readouts.png](./promo/micro-3d-readouts.png) |
| 390 oil immersion | [docs/promo/micro-390-oil.png](./promo/micro-390-oil.png) |
| WebKit orbit stage | [docs/promo/micro-webkit-3d.png](./promo/micro-webkit-3d.png) |

## Narrow (≈390)

- Rail starts **closed**; open via 「光学参数」 / Optical params.
- Strip stays sticky above domains; opening the rail must keep λ / NA outputs linked to `#micro-metric` values.

## Capture / Playwright helpers

`window.__labCapture.getWebglStage()` → live stage; `stage.getHits()` → CSS-pixel
pick targets after the last `draw()`. Short contract: [`docs/microscope-webgl-api.md`](./microscope-webgl-api.md).

## Pages asset-stamp

Fingerprint authority is the **JSON fields** in `asset-stamp.json` (`js`, `css`, `microCss`, `main`, `bundleMeta`, …), mirrored into `index.html` (`imm-js` / CSS `?v=`). GitHub Pages does **not** honor repo `_headers` Cache-Control; treat CDN `Cache-Control` as advisory and bust with stamp fields / `?v=` only.

Deploy check (after Pages workflow green): `curl -sS https://otas0.github.io/immspfee/asset-stamp.json` must show non-empty `bundleMeta` and `microCss`.

**`bundleMeta` may differ from a local checkout.** The Pages workflow runs `npm run build:bundle` before `prepare-site`, so the deployed `bundleMeta` / `js` / `main` hashes are those of the **CI rebuild**, not necessarily the hashes committed in the repo. Prefer matching **`microCss`** (and other pure static CSS/domain fields) to the commit; treat `bundleMeta` equality as best-effort unless you also commit the CI-built `js/bundle/*` outputs.
