# Palette shards

Browser runtime **must not** fetch `data/palettes.json`.

- Cold: `data/palettes/cold-stub.json` (free-fall + neutral) via `js/utils/theme.js`
- Lazy: `data/palettes/domains/*.json` (domain or `domain/sub` keys)
- Map: `model-domain.json`
- Shared: `shared.json`
- `data/palettes.json` remains **gen-only source** for `npm run gen:palette-domains`
