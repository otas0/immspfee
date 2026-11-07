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

## Parallel agents / file locks

Do not set macOS `uchg` on lab files. If writes fail with `Operation not permitted`, run `chflags nouchg` on the path (see `docs/commit-notes.md`). Avoid racing a second Agents Window against this tree.

If a microscope / WebKit agent and a mobile-drawer agent both touch `css/styles.css`, **rebase (or merge main) before push** — never overwrite classic phone drawer z-index rules with projector `position:fixed` menu/params.

**Boot-perf files:** do not revert cold-path wins in `js/entry.js`, `js/utils/theme.js`,
`js/boot/domainPack.js`, or the free-fall palette stub in `scripts/build-bundle.mjs` when
editing microscope/WebKit. Rebase instead of restoring older entry/theme copies.


## Classic phone drawer vs Projector overlay (z-index)

| Layer | Classic ≤900 | Projector overlay |
| --- | --- | --- |
| Backdrop | 24 | 24 |
| Toolbar (in stage) | 32 | 50 (stage band) |
| Open catalog / sidebar | 45 (clears toolbar band; width leaves ≥48px backdrop strip) | 60 (clears `--projector-overlay-top`) |
| `#btn-menu` / `#btn-params` | relative 50 — **never `position:fixed`** | `position:fixed; z-index:70` |
| `.lab-toast` | 90 (above sticky `.sidebar-foot`) | 90 |

Do **not** reapply `body.drawer-open #btn-menu { position:fixed }` to classic drawers — that stacked Play/Reset over the catalog. Full write-up: `docs/projector-overlay.md` § Menu above dimmer. Asserted by `test:narrow` + `test:pages-mobile` (`scripts/drawer-stack-probe.mjs`).

## Lab bundle (`js/bundle/`)

- Directory dirt is gitignored; **track `lab.js`, `chunk-*.js`, and `meta.json`**. Chunk filenames already carry a content hash (`chunk-[name]-[hash].js`), so bare relative imports stay cache-safe without `?v=`.
- `build:bundle` wipes the folder first so orphan hashed chunks cannot linger.
- Before every push that touches `js/main.js`, shells, models, or i18n: run `npm run build:bundle`, commit the new `js/bundle/*` outputs, then refresh stamps (`prepare-site` on Pages, or rewrite `index.html` / `asset-stamp.json` locally).
- `asset-stamp.json` / `index.html` `imm-js` use `entryStamp(entry.js + lab.js)` — HTML and the entry module share one deploy stamp. Entry also exposes `window.__LAB_ASSET_V` and stamps dynamic relative URLs via `stampedUrl()`.
- CI rebuilds the bundle before the `focusCatalogModel` fingerprint check so Pages and `test.yml` cannot drift silently.

## Dev server

`node scripts/dev-server.mjs` writes `.lab-server.pid` (port + pid). A second instance on the same `PORT` exits instead of binding a zombie listener after SIGKILL/SIGTERM races.

## WebKit / Safari proxy checklist

1. Close any **second Agents Window** before editing this tree (file lock / race risk).
2. Local projector WebKit shot: `SHELL_WEBKIT_ONLY=1 npm run test:shell-chrome` (dev server up).
3. Sync tracked manual asset when the shot drifts:
   ```bash
   npm run sync:safari-proxy
   git add docs/assets/shell-projector-1000-safari-proxy.png
   git commit -m "chore(webkit): sync safari-proxy asset"
   ```
4. CI `[webkit]` job uploads `webkit-safari-proxy-<sha>`; on `DRIFTED=1` it opens/comments a GitHub issue (bot **cannot** push — human/agent commits the sync).
5. **shots vs docs:** `shots/shell-*.png` is gitignored scratch; only `docs/assets/shell-projector-1000-safari-proxy.png` is tracked for `manual.html`. Sync from the CI artifact (or `npm run sync:safari-proxy` after a local WebKit shot).
6. After Pages deploy: hard-reload Safari (`⌘⇧R`) on `?shell=lab-microscope3d` for full-bleed; confirm `manual.html` image `?v=` equals `asset-stamp.json` → `docsAssets` (content hash of `docs/assets/*`, not only imm-js).
7. Incognito / fresh profile: SW cache name `immspfee-hashed-v7` + microscope full-bleed after deploy. Hard-reload (⌘⇧R) once after deploy so activate drops `v6`.
