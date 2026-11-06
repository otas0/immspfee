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
│  IMMSPFEE brand row · Back to catalog only (no 1517 shell list)       │
│  ┌──────────────────────────────────────────┬───────────────────────┐ │
│  │  WebGL structure (orbit + turret hits)   │  Optical rail         │ │
│  │  same onPointer semantics as 2D turret   │  objective / eyepiece │ │
│  │  oil film iff optics.immersion           │  NA / λ / immersion   │ │
│  │                                          │  (no catalog speed…)  │ │
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
