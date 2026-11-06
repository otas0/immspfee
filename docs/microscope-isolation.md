# Microscope input isolation

The compound microscope is the only WebGL/3D experience. Catalog lab chrome and the microscope shell must not share keyboard or control routing.

## Mode flag

`document.documentElement.dataset.inputMode` is either `lab` or `microscope` (`js/shells/inputMode.js`).

- Entering `lab-microscope3d` sets `microscope`.
- Leaving for any catalog shell sets `lab`.

## Rules while `inputMode === microscope`

1. Catalog keydown handlers (Ctrl/Cmd+Z edge undo, Esc sidebar/bench, arrow / j·k model cycling) do not run.
2. Wheel over `#model-list` / `#sidebar` is swallowed; the optical rail may still scroll.
3. Escape closes the optical rail first, then exits to Lab Classic and
   **restores the catalog model that was active before entering WebGL**
   (not a forced jump to 2D `r016-显微镜`). Deep-link enter with no prior
   model still lands on `r016` 2D after exit.
4. `#btn-micro-shot` captures `#canvas-webgl` only — never `#btn-shot` / 2D export.
5. `#btn-micro-reset` / `#btn-micro-params` only act when the active model is `r016-显微镜`.
6. Sidebar / bench / HUD stay hidden; shell select is remounted to a single “Back to catalog” option.
7. Readouts and params live in `#micro-stage` (`js/shells/microscopeStage.js`), not `#bench` / `.hud`.
8. Cold enter keeps `#micro-rail` closed (open via Params). `#micro-lambda` shows `\d+ nm`.
9. `?shell=lab-microscope3d` pins `r016-显微镜` on boot so catalog `free-fall` cannot kick the shell.

## Rules while `inputMode === lab`

1. Microscope chrome stays `hidden`; `#micro-stage` stays `hidden`.
2. WebGL canvas stays hidden unless a future non-catalog stage opts in.
3. Pointer handlers on `#canvas` stay 2D-only.
4. The normal catalog row `r016-显微镜` (物理 ▸ 光学) stays on Lab Classic 2D.
5. The only sidebar path into WebGL is the isolated `#btn-micro3d-entry` strip above every domain fold (`renderMicro3dStrip` in `js/main.js`).

## Layout comparison

See [microscope-2d-vs-webgl.md](./microscope-2d-vs-webgl.md).

## Regression gate

`npm run test:shell` must print `shell chrome ok` (CI summary + `artifacts/shell-chrome.log`). The suite opens the microscope shell, asserts isolated rail/readouts, Ctrl+Z isolation, exit → 物理/光学 + r016 highlight, and a 390px non-overlap layout.
