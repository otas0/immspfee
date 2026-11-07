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

## `stage.getActivityRing()`

Projects the active objective’s barrel collar to CSS pixels `{ x, y, r }` from the
last `draw()`. The collar sits at the DIN ring (`turY + OBJECTIVE_COLLAR_DY`, about
`turY - 0.094`), not the nosepiece marker at `turY + 0.045`. Mesh color is
`ACTIVITY_RING` in `js/models/microscopeOptics.js` (teaching magenta, not a DIN band).

## Oil blend

`getOilBlend()` is 0..1 toward the real immersion flag (100×). Rise is linear over
`getOilRiseSec()` (0.45 s); fall is linear over 0.32 s. `getOilRiseElapsed()` is
seconds into the current rise. Assert with `npm run test:micro-oil`.

## Related

- Overlay captions: `stage.getOverlayLabels()` → `#micro-gl-labels` via
  `microUi.syncOverlayLabels`. The host stays mounted. `params.showLabels=0` hides
  standing captions; hover and knob-drag still show one temporary caption.
  Viewports ≤480px default `showLabels=0` once (`labelsPrefSet` in
  `js/shells/microscopeStage.js`).
- Focus knobs: coarse moves large `focusZ_mm`+`WD_mm`; fine nudges both, and when
  `focusZ_mm` is clamped at ±2 only WD continues (`npm run test:micro-knobs`,
  `test:micro-knobs:390`). Drags dispatch `PointerEvent`s. IPD drag updates
  `#micro-ipd-out`.
- Magenta activity-ring pixels: `npm run test:micro-magenta` and
  `test:micro-magenta:390` (`VIEWPORT=WxH`, `MICRO_BROWSER=webkit` optional).
  The probe samples `getActivityRing()` and opens the optical rail before 40×.
- Palette distance (ACTIVITY_RING vs DIN): `npm run test:micro-palette`.
- Mesh / layout: `js/viz/microscopeMeshBuild.js`, `js/viz/microscopeLayout.js`.
  DIN numerals are 7-segment strokes `0–9` plus `×`.
- Interpupillary: `params.interpupillary_mm` (50–75) + drag kind `interpupillary`.
