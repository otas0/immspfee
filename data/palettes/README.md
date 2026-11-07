# Palette shards

`data/palettes.json` is **deprecated for browser cold/warm fetches**.

- Runtime: free-fall stub in `lab.js` + `data/palettes/domains/*.json` (keyed by domain, or `物理/<sub>`).
- Map: `model-domain.json` (model id → shard key).
- Shared: `shared.json` (neutral + hc).
- Keep the monolith only for Node tests / `gen:palette-domains` source of truth until fully retired.
