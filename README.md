# IMMSPFEE · Lab

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-otas0.github.io%2Fimmspfee-0B3D2E?logo=github)](https://otas0.github.io/immspfee/)

Browser-based simulation workbench: **1500+ models** (hand-tuned + one engine entry per family; axis/presets live on the param bench, not as sidebar clones) · shared Model contract · Web/Canvas visuals · customizable parameter bench.

**Repo language:** English is the source of truth for README, docs, UI chrome defaults, commits, and new code comments. Locale packs (`zh` / `ja` / …) localize the running Lab; catalog source strings may still include Chinese titles until packs cover them.

## Architecture

Aligned with [scikit-complexity](https://pypi.org/project/scikit-complexity/) **catalog + unified interface**, with the visualization layer reimplemented in Web/Canvas (no Python / Rerun runtime):

| Borrowed from | Used here |
|---------------|-----------|
| scikit-complexity | `catalog` + `family`/`formalism`; shared `init/step/draw/getReadouts/refresh` |
| PhET / oPhysics / SimuPhysics | Single-model interaction: drag, readout compare, construction lines |
| Algorithm Visualizer / eigenvue | CS: step highlights, pick edges, netlist wiring (ideas only) |
| Engineering teaching benches | Teaching → industrial-grade paths in one shell |

Default fidelity is often `principle` unless stamped otherwise. Factory families: `js/lab/formalism.js`.

## Hard rules

**Every model must be usable** — rich params; check ethics/theory against authoritative sources before claiming engineering fidelity.

- **No fake data:** state / readouts / plots / exports must follow real equations or algorithms; defaults are meaningful and **all parameters are customizable** via `paramSchema`. Decorative or canned numbers are forbidden.
- `params` + `paramSchema` (group / label / unit / min·max; prefer ≥4 keys)
- `init` / `step` / `draw` / `getReadouts` / `refresh`
- Live vs reinit follows `schema.group` (dynamics/display/custom = live; initial/numerics = reinit)
- Contract tests green; failures → `artifacts/contract-failures.json`
- Optional: `onPointer`, `runAction`, energy helpers, `capabilities.actions`
- Correctness metadata (`authority` / `assumptions` / `fidelity`) stays in catalog for audits — **not** painted on the stage UI
- Custom models: sidebar “+ custom model”; edit/delete/export/import JSON (`localStorage`)
- Ethics-sensitive families: [docs/ethics-audit.md](./docs/ethics-audit.md)
- Coverage: `npm run report:authority` · fake-data sweep: `npm run report:fake-data`
- **3D:** one microscope experience only; catalog stage remains 2D Canvas

## Shell layers

| Layer | Role |
|-------|------|
| Catalog | `data/catalog.json`; domain / subcategory sidebar |
| Shell(s) | Pluggable chassis via `js/shells/registry.js` (`?shell=lab-classic` / `lab-focus` / `lab-projector` / `lab-microscope3d`); `deriveCapabilities` for formalism / hint / pointer / actions |
| Stage | Shared canvas (2D); reserved single WebGL path for microscope |

### Shell / Projector

- **Lab Classic / Focus:** two-column compact layout ≤1100px; params use a fixed drawer (no empty third grid column).
- **Lab Projector:** sidebar hidden; toolbar menu opens a temporary catalog overlay. Stage stays pinned so overlay open/close never collapses width to 0 (white stage). See [docs/projector-overlay.md](./docs/projector-overlay.md).
- **Shots (Pages):** closed vs overlay — [docs/promo/shell-projector-1000.png](./docs/promo/shell-projector-1000.png) · [docs/promo/shell-projector-1000-overlay.png](./docs/promo/shell-projector-1000-overlay.png).
- Deep links: `?shell=lab-projector`, `?shell=lab-microscope3d&lang=en`.
| Bench | Schema controls; ≥20 params → focus dynamics by default |
| HUD | Snapshot compare, class-pack JSON/ZIP, safe defaults |

## Family generator

Definitions: [`scripts/family-defs.mjs`](./scripts/family-defs.mjs) → [`data/families.json`](./data/families.json).

```bash
npm run gen:families
node scripts/dedupe-family-variants.mjs
npm run gen:families -- --dry-run
npm run gen:model-locales   # data/locales/models-en.json + models-ja.json
```

IDs look like `fam-<slug>-vNN`. Prefer one `-v01` entry per family engine.

## Live

**https://otas0.github.io/immspfee/**

[![Open Lab](https://img.shields.io/badge/Live-immspfee%20Lab-1F6F4A?style=for-the-badge)](https://otas0.github.io/immspfee/)

Deployed by `.github/workflows/pages.yml` from repo root. Relative asset paths (`./…`). Deep link: `#m=<id>`. Locale: `?lang=en` (also `zh`, `ja`, `ko`, `es`, `fr`, `de`) synced with `localStorage`.

## Scripts

```bash
npm start
npm test
npm run test:catalog
npm run report:schema
npm run test:contract-browser
CONTRACT_SAMPLE=800 npm test
npm run test:all
```

See [manual.html](./manual.html) and [docs/schema-coverage.md](./docs/schema-coverage.md).

## CI runners (GitHub.com + GHES)

Public Actions on this repo use **GitHub-hosted** labels only:

| Job family | Runner label | Notes |
|------------|--------------|--------|
| Unit / contract / Pages probes | `ubuntu-latest` | Node **22**; Playwright Chromium |
| WebKit safari-proxy | `macos-latest` | `macos-14` is **unsupported** here; do not pin it |
| Pages deploy | `ubuntu-latest` | `.github/workflows/pages.yml` |

**GHES / self-hosted matrix** (when mirroring this workflow behind Enterprise):

| Label example | Use for | Node / browser |
|---------------|---------|----------------|
| `self-hosted` + `linux` + `x64` | contract, pages-tti-sw, pages-network | Node 22+; `npx playwright install chromium --with-deps` |
| `self-hosted` + `macOS` + `arm64` | WebKit / safari-proxy only | Node 22+; `npx playwright install webkit` |
| Avoid | Custom `macos-14-*` cloud labels unless your GHES fleet advertises them | Prefer `macos-latest` semantics or explicit fleet tags you control |

Action major versions in-tree: `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v6`, `actions/cache@v5` (Node 24 runtime). Keep GHES runners on images that satisfy those action runtimes.

## Adding a factory family

Read **[docs/add-factory-family.md](./docs/add-factory-family.md)**, then:

```bash
npm run new:family -- name=fluid
```

Attach `"family": "fluid"` in `data/catalog.json` and run `npm test`.

Hand models (`family: "hand"`): **[docs/hand-models.md](./docs/hand-models.md)**.

Brand mark: [`assets/immspfee-logo.png`](./assets/immspfee-logo.png) · favicon [`assets/favicon.svg`](./assets/favicon.svg).

Instructor briefing poster (local): [`docs/promo/poster.html`](./docs/promo/poster.html) or root [`poster.html`](./poster.html).

## Params & compact UI

- Wide-range NaN → “safe defaults”
- Compare: pin / save / switch / export·import
- Fold: expand/collapse all + click headings
- Compact: icon toolbar; menu drawer; params drawer

| State | Shot |
|-------|------|
| Menu closed | ![menu closed](./shots/ui-mobile-menu-closed.png) |
| Menu open | ![menu open](./shots/ui-mobile-menu-open.png) |
| Toolbar | ![toolbar](./shots/ui-mobile-toolbar.png) |
| Bezel | ![bezel](./shots/ui-mobile-bezel.png) |
| HC toolbar | ![hc](./shots/ui-hc-toolbar.png) |
