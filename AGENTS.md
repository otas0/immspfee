# Agent / contributor notes

- **English-first:** README, docs under `docs/`, UI chrome defaults, commit messages, PR text, and new comments are written in English.
- **Locales:** Runtime translations live in `js/i18n/` and lazy packs under `data/locales/`. Do not reintroduce Chinese as the default shell language.
- **Catalog:** Source entries may still carry Chinese `name`/`description`; prefer extending locale packs (`npm run gen:model-locales`) over duplicating sidebar clones.
- **Tests:** `npm test` must stay green before push.

## Hard product rules

1. **No fake data.** Every model’s state, readouts, plots, and exports must come from the governing equations / algorithms with user-editable `params` + `paramSchema`. Do not invent decorative numbers, canned demo traces, or placeholder physics. Defaults must be real, physically/algorithmically meaningful values that users can customize.
2. **No assumption / fidelity chrome.** Do not put ENGINEERING/principle badges, assumption paragraphs, caveat banners, or “not for long-term forecast” disclaimers on the canvas, model-shell strip, sidebar list, apply-banner, or HUD. Keep `authority` / `assumptions` / `fidelity` in catalog metadata for audits and custom-model validation only.
3. **Multiple shells.** The chassis is not frozen. Register new layouts in `js/shells/registry.js` (`?shell=` + `localStorage`). Engines stay shared; only chrome/layout differs.
4. **3D scope.** Ship **one** WebGL/Three-style 3D experience (compound microscope). Do not proliferate parallel 3D shells; 2D Canvas remains the default stage for the catalog.
