# Microscope WebGL stage API (capture / Playwright)

The dedicated shell `lab-microscope3d` mounts a single WebGL stage via
`createMicroscopeWebgl` (`js/viz/microscopeWebgl.js`). Capture helpers and
knob-drag tests reach it through `window.__labCapture`.

## `window.__labCapture.getWebglStage()`

Returns the live stage object created by `ensureWebglStage()` in `js/main.js`,
or `null` / `undefined` before enter / if WebGL failed.

Typical wait:

```js
await page.waitForFunction(() => {
  const s = window.__labCapture?.getWebglStage?.();
  return s && typeof s.getHits === 'function' && s.getHits().length > 0;
});
```

## `stage.getHits()`

Screen-space pick targets from the **last** `draw()` (CSS pixels in the stage
view, origin top-left of the WebGL canvas logical size).

Each hit:

| field | meaning |
| --- | --- |
| `kind` | `obj` / `eye` / `focusCoarse` / `focusFine` / `stageX` / `stageY` / `condenser` / `iris` / `fieldIris` / `lamp` / `tubeL` / `immersion` / `clip` |
| `index` | Objective/eyepiece/clip index, or side for focus knobs |
| `x`, `y` | Center in CSS px relative to the canvas |
| `r` | Hit radius in CSS px |

Map to client coordinates with the canvas `getBoundingClientRect()`:

```js
const canvas = document.getElementById('canvas-webgl');
const rect = canvas.getBoundingClientRect();
const hit = stage.getHits().find((h) => h.kind === 'focusFine');
const clientX = rect.left + hit.x;
const clientY = rect.top + hit.y;
```

Call `paintFrame()` (or wait one rAF) before reading hits after a param change
— layout and projection update only on draw.

## Related

- Overlay captions: `stage.getOverlayLabels()` → `#micro-gl-labels` via
  `microUi.syncOverlayLabels`. Hide with rail **3D labels** / `params.showLabels=0`.
- Focus knobs: coarse moves large `focusZ_mm`+`WD_mm`; fine nudges both, and when
  `focusZ_mm` is clamped at ±2 only WD continues (`npm run test:micro-knobs`).
- Magenta activity ring pixel assert: `npm run test:micro-magenta`.
- Mesh / layout: `js/viz/microscopeMeshBuild.js`, `js/viz/microscopeLayout.js`.
- Interpupillary: `params.interpupillary_mm` (50–75) + drag kind `interpupillary`.
