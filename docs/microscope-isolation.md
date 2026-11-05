# Microscope input isolation

The compound microscope is the only WebGL/3D experience. Catalog lab chrome and the microscope shell must not share keyboard or control routing.

## Mode flag

`document.documentElement.dataset.inputMode` is either `lab` or `microscope` (`js/shells/inputMode.js`).

- Entering `lab-microscope3d` sets `microscope`.
- Leaving for any catalog shell sets `lab`.

## Rules while `inputMode === microscope`

1. Catalog keydown handlers (Ctrl/Cmd+Z edge undo, Esc sidebar/bench) do not run.
2. Escape closes the optical rail first, then exits to Lab Classic.
3. `#btn-micro-shot` captures `#canvas-webgl` only — never `#btn-shot` / 2D export.
4. `#btn-micro-reset` / `#btn-micro-params` only act when the active model is `r016-显微镜`.
5. Sidebar / bench / HUD stay hidden; shell select is remounted to a single “Back to catalog” option.
6. Readouts and params live in `#micro-stage` (`js/shells/microscopeStage.js`), not `#bench` / `.hud`.

## Rules while `inputMode === lab`

1. Microscope chrome stays `hidden`; `#micro-stage` stays `hidden`.
2. WebGL canvas stays hidden unless a future non-catalog stage opts in.
3. Pointer handlers on `#canvas` stay 2D-only.

## Layout comparison

See [microscope-2d-vs-webgl.md](./microscope-2d-vs-webgl.md).

## Regression gate

`npm run test:shell` must print `shell chrome ok` (CI summary + `artifacts/shell-chrome.log`). The suite opens the microscope shell, asserts isolated rail/readouts, Ctrl+Z isolation, exit → 物理/光学 + r016 highlight, and a 390px non-overlap layout.
