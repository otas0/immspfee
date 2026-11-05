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

- `params` + `paramSchema` (group / label / unit / min·max; prefer ≥4 keys)
- `init` / `step` / `draw` / `getReadouts` / `refresh`
- Live vs reinit follows `schema.group` (dynamics/display/custom = live; initial/numerics = reinit)
- Contract tests green; failures → `artifacts/contract-failures.json`
- Optional: `onPointer`, `runAction`, energy helpers, `capabilities.actions`
- Correctness: catalog `authority` / `assumptions` / `fidelity` — see [docs/model-correctness.md](./docs/model-correctness.md)
- Custom models: sidebar “+ custom model”; edit/delete/export/import JSON (`localStorage`)
- Ethics-sensitive families: [docs/ethics-audit.md](./docs/ethics-audit.md)
- Coverage: `npm run report:authority`

## Shell layers

| Layer | Role |
|-------|------|
| Catalog | `data/catalog.json`; domain / subcategory sidebar |
| Shell | `deriveCapabilities`: formalism / hint / pointer / actions |
| Stage | Shared canvas |
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
