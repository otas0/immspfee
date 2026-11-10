# Boot timing vs catalog size

Recorded against `npm run test:boot-timing` (Chromium via Playwright; local WebKit may SIGABRT on some hosts).

| Catalog size | Context | Notes |
|-------------:|---------|-------|
| ~1500+ | Pre-prune course `r###` shells + misbound CS/econ | Sidebar paint dominated by catalog JSON + domain index; cold boot often multi-second on Pages |
| ~402–406 | Post-prune completed set (hand + famPhysics + named standalones) | Sidebar ~402 entries; after danger-family topic-null drop ≈ **382** |
| ~382 | Current: familyFallback null for tree/compile/turing/comm/discrete; weak CS fam shells removed | Re-run `npm run test:boot-timing` with local `scripts/dev-server.mjs` and paste median `catalogReady` / `firstPaint` here after each major catalog change |

## How to refresh

```bash
node scripts/dev-server.mjs &
npm run test:boot-timing
```

Compare `catalogReadyMs` and model count in the script output. Prefer median of ≥3 runs; do not treat a single SIGABRT as a regression.
