# Commit notes (no history rewrite)

## Duplicate palette payload commits

`4410ed2` and `cc343f0` share the same subject line:

> Cut the lab bundle's palette payload and stop the first screen from fetching every physics model.

Both already landed on `main` / origin. **Do not** squash or rewrite them on
the shared branch (force-push is disallowed). Treat `cc343f0` as the earlier
landing and `4410ed2` as the follow-up that kept the same summary — prefer a
distinct message next time a palette/boot change lands.

## Boot-bundle stash digestion (2026-11-05)

Stashes titled `wip: boot-bundle / pages-check / glyph parallel tree` were dropped
after audit: `_headers`, `scripts/sw-cache.mjs`, and the hashed SW policy were
already on `main`. Remaining stash hunks would have reintroduced on-stage
assumption/caveat strips and undone cold-boot folded domains — rejected against
`AGENTS.md` and `b13c1f5` / `fd779ba`.

## Parallel agent file locks (onboarding)

`uchg` (user immutable) on `index.html` / related files caused
`Operation not permitted` on unlink/write while two Cursor hosts ran
(`extension-host Agents Window`, `extension-host immspfee-education`).

**Do not set `uchg` on any lab file from agents or shell helpers.** Prefer
ordinary file locks / closing the second Agents Window over macOS flags.

**Cancel the parallel Agents Window write-conflict drill.** Do not reopen a
second Agents Window against this tree to “practice” races; one writer only.
If a second window is already open, close it before editing lab files.

**Keep a single Agents Window.** Concurrent agent hosts rewriting
`js/entry.js` / `js/models/factoryLoader.js` / `js/bundle/*` caused
double-writes and mismatched SW factory-chunk priming. Prefer one writer;
review dirty diffs before a second host touches the same paths.

### Agents Window + factory-chunk sessionStorage checklist

Before a boot / SW / Pages change lands, confirm in one writer only:

1. **One Agents Window** against `physics-demo` (close any second host).
2. `js/entry.js` still primes `sessionStorage['immspfee-factory-chunk']` into the
   SW `prime` URL list after subject open (do not drop the try/catch).
3. `js/models/factoryLoader.js` still writes that key when the factory chunk URL
   resolves, and posts `prime` when `navigator.serviceWorker.controller` exists.
4. `scripts/sw-cache.mjs` still asserts the second subject open hits
   `chunk-factory` from `X-Imm-SW: cache` (not network).
5. After `build:bundle`, commit `js/bundle/lab.js` + hashed `chunk-*` +
   `meta.json` together with `asset-stamp.json` / `index.html` stamps.
6. Do not set `uchg` on lab files; if writes fail with `Operation not permitted`,
   `chflags nouchg` the path (see below) instead of opening a second window.
7. **Single writer until `main` is pushed.** Open a second Agents Window only for
   read-only review after the push lands; never two writers on `js/` / `css/` /
   `scripts/` at once.
8. **LOW_INK guard sync:** `js/lab/lowInkIds.js` `applyLowInkStrokeBoost` must stay
   aligned with the template inside `scripts/gen-low-ink.mjs` (optional
   `strokeRect` / `fillRect` on probe canvases). After editing either side, re-run
   `npm run gen:low-ink` or hand-copy the wrapper.

### low-ink table drift (CI)

The test job no longer opens a bot PR (`GITHUB_TOKEN` cannot push
`chore/low-ink-table-sync`). When `gen:low-ink` drifts:

1. Download the `low-ink-table-diff` artifact from the failed/green run, **or**
2. Locally: `npm run test:contract-browser && npm run gen:low-ink`
3. Commit `data/principle-low-ink.json` (+ `js/lab/lowInkIds.js` if touched)
   and push **directly to `main`**.

`gen:low-ink` unions ink &lt; 1% **and** principle sparse &lt; 1.5% (plus
`principleInk.sparse` from the contract payload) so models like
`neutron-diffusion` that hover near 1% need fewer hand edits.

### Mobile / tablet perf budget (P0–P2)

`js/utils/mobilePerf.js` clamps `maxSubSteps`, Mandelbrot/interference grids, particle
`N`, field `n`, life gens, and microscope `dprCap` by viewport tier (`phone` ≤900 /
short-height, `tablet` ≤1100, else `desktop`). Heavy ids (`data/perf-heavy.json` +
`HEAVY_MODEL_IDS`) auto-pause on compact enter with `toast.heavyPaused`. HUD DOM
writes throttle to ~8Hz on phone and skip unchanged readout signatures on desktop.
Bottom bench height is capped so `.canvas-wrap` keeps `min-height: 120px`. Stage tap
dismisses bench on all compact widths (not only ≤900). Particles use a spatial hash
(`particleNCap` 64 phone / 80 tablet). Mandelbrot caches an offscreen canvas when
params/size are unchanged; lorenz/rossler trails use a head-index ring buffer.
`npm test` asserts `perf-heavy.json` ↔ `HEAVY_MODEL_IDS`. Covered by
`npm run test:narrow` (heavy + watchdog + tablet + landscape) and
`npm run test:pages-mobile` (post-deploy hard gate in `pages.yml`; advisory
`continue-on-error` in `test.yml`). Stamp gate: `npm run test:pages-stamp`
records live `asset-stamp.json`, asserts match to this deploy’s built stamp,
and advisories when unchanged vs cache. Follow-ups: sidebar `heavy` filter chip
+ English `aria-label`; Mandelbrot cache keyed by DPR; adaptive spatial-hash
cell; HUD compare per-card patch; desktop Power saver (tablet budget);
lorenz ring rebuild on trailCap change; WebKit `SHELL_WEBKIT_ONLY` also smokes
micro 390; `manual.html` §9b 390 Params open/closed shots. Manual Safari
toast/feel remains human-only.

### soft-paint issue template smoke

Open via GitHub **New issue → Contract soft-paint** (`.github/ISSUE_TEMPLATE/soft-paint.yml`).
Labels must bind as `soft-paint` + `contract` + `bug` (create missing labels once per fork).
Fill model id + triage fork from the table below; close after confirming label chips
(template checkbox: “Before closing — confirm labels …”).

### microscope 3D mesh bar

WebGL mesh targets **above** typical NOBOOK teaching cutaways (enamel/chrome,
Siedentopf binocular, DIN rings, mechanical stage, Abbe + Köhler). Still one
WebGL path. Rail shows DIN ring legend; do not put fidelity caveats on canvas.

### soft-paint / open-channel first frame

`SOFT soft-paint open-channel-uniform` with `painted≈1` was title-only ink:
factory `shell()` init stepped once (`hist.length === 1`) and `draw` returned
before the stroke. Fix: duplicate the init ordinate so the first paint has a
flat line; contract retries also `step` + denser sample (step 4). Soft remains
a warn path for true empty canvases with readouts. Spot-check other steady
`shell()` factory models with `node scripts/shell-first-paint.mjs` (also CI,
`timeout-minutes: 3`).

**`fam-*` variants do not use `shell()` hist** — they ink via family sketches /
gauges (`hist.length` stays 0). Do not force-seed hist on fam models; first-paint
gate is `painted≥2` + readouts, not hist. `shell-first-paint` also samples a
handful of `fam-*` non-flow ids for that gate.

#### Soft reappears — triage fork

| Signal | Likely cause | Fix path |
|--------|--------------|----------|
| `painted≈1`, factory `shell()` / flow ODE, `hist.length < 2` | Init ordinate only | Seed duplicate hist in `topicModel.shell()` (or model `init`) |
| Flaky soft on denser CI sample, ink returns on retry | Sample timing / one-step draw | Keep contract `step` + denser sample; do **not** invent decorative ink |
| `fam-*` soft with `hist.length === 0` | Family sketch / gauge not drawing | Fix family `draw`, not hist seed |
| Soft + empty readouts | Real empty canvas | Fail hard / fix model |

### pages-network-cold budget vs wall-clock

CI asserts **jsCount ≤ 5**, no module-waterfall, no cold `chunk-factory` /
`chunk-chunk-*`. Wall-clock advisory uses **`bootMsP95`** across
`BOOT_SAMPLES` (default 3), not a single cold hit
(`PAGES_NETWORK_ADVISORY_BOOT_MS`, default 12000) — not a hard fail.
Spike lines append `edge=<region>` when the p95 sample recorded a CDN edge
(from `cf-ray` / `x-served-by`); absence of `edge=` means the spike sample had
no edge header, not that logging is broken.
Use `npm run test:pages-tti-sw` for SW-blocked vs second-hit deltas.
`firstHandP95 > FIRST_HAND_P95_WARN_MS` (default 10000) logs an advisory warn;
`cdnJitter: true` when `warm.readyMs > cold.readyMs`.

### locale dead keys vs `lab.gz`

Static unused-key audits (~48 candidates: `dialog.*`, some `ui.boot*`, etc.)
are **eval-only** — many keys are dynamic (`t(\`dialog.${x}\`)`) or boot-injected.
Do **not** mass-delete for gzip wins. Already dropped: canvas `caveat.*` with no
runtime consumer. Next cut: confirm each candidate with `rg` + `data-i18n` before
removing from `js/i18n/strings.js`.

### designCaveatText vs no-assumption-chrome

**Verdict: painting caveat on the canvas violated AGENTS.** `#shell-caveat` was
already stripped from the shell; `topicModel.shell().draw` still `fillText` the
nuclear/electrochem/membrane caveat under the title. Removed. `designCaveat.js`
keeps key ids for audits; localized `caveat.*` strings were dropped from
`strings.js` (no runtime consumer → smaller `lab.js`). `assert-no-stage-strips`
gates `designCaveatText(` in `topicModel.js` and factory-chunk `fillText(caveat)`.

### macos-14 WebKit runner

Do **not** set `runs-on: macos-14` for `webkit-projector` on this repo until
GitHub supports the label again. Observed cancel with annotation
`The configuration 'macos-14-arm64-us-default' is not supported` (zero steps).
Use `macos-latest`. Re-try `macos-14` only after a workflow_dispatch probe
shows the job actually starts (non-empty steps) without that annotation.

### Node 20 action runtime warning / DEP0169

`node-version: '22'` alone does not clear the warning — `actions/checkout@v4`
and `actions/setup-node@v4` still run on the Node 20 *action* runtime.
Bump both to `@v5` (Node 24 runtime). Also bump `actions/upload-artifact@v6`
and `actions/cache@v5` (Node 24). The `url.parse` DEP0169 in the WebKit job
log came from **setup-node post**, not lab source (no `url.parse` in
`js/` / `scripts/`).

**`actions/upload-artifact@v6` / `actions/cache@v5` on GHES:** both require
Actions Runner **≥ 2.327.1** (Node 24 runtime). Self-hosted / GHES admins must
upgrade runners before pinning these majors; github.com-hosted runners already
qualify.

### Playwright + service worker tests

`js/entry.js` skips `navigator.serviceWorker.register` when
`navigator.webdriver === true`. Playwright sets that flag, so SW never
installs unless the test context spoofs it:

```js
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
```

Required in `scripts/sw-cache.mjs` and `scripts/pages-tti-sw.mjs`. Without the
spoof, warm TTI looks like another cold network fetch.

### pages-tti-sw hard gate

CI runs `PAGES_TTI_HARD=1`: fail if the warm visit has no SW controller /
`immspfee-hashed-*` cache. Wall-clock and `firstHandMs` p50/p95 stay advisory
(`FIRST_HAND_SAMPLES`, default 5). JSON includes `cdnJitter` when
`warm.readyMs > cold.readyMs`, and logs advisory when `firstHandP95` >
`FIRST_HAND_P95_WARN_MS` (default 10000).

### Cold → warm SW controller timeline (Pages, webdriver spoofed)

Measured against `otas0.github.io/immspfee` (Playwright Chromium + WebKit,
`navigator.webdriver` spoofed so `entry.js` registers SW):

| Visit | Typical | Notes |
|-------|---------|--------|
| Cold (first navigation) | cache `immspfee-hashed-v6` may appear while `controller` is still **false** | First document is not yet controlled |
| Warm (reload / second hit) | `controller: true`, same cache name, `sw.js?v=<imm-js stamp>` within ~2–4 s | Hard gate uses this visit |
| Microscope 390 | `html.shell-micro-active`, WebGL stage full viewport width, `#sidebar` `display:none` | Confirm after deploy + ⌘⇧R / private window |

Incognito / private: same cold→warm pattern — confirm Application → Cache Storage
name `immspfee-hashed-v6` on the warm load after ⌘⇧R.

### safari-proxy shots vs docs/assets

If local `shots/shell-projector-1000-safari-proxy.png` ≠ tracked
`docs/assets/…`, **keep docs** when it already matches Pages. Do not
`sync:safari-proxy` from an orphan local shot. Re-run
`SHELL_WEBKIT_ONLY=1 npm run test:shell-chrome` then sync only when CI
`DRIFTED=1` (or you intentionally refresh the manual figure).

`.gitignore` ignores `shots/shell-*.png` (local / CI scratch). The tracked
manual figure is **`docs/assets/shell-projector-1000-safari-proxy.png`**
(allowlisted). CI uploads both paths as `webkit-safari-proxy-<sha>`; humans
copy from the artifact into `docs/assets/` (or `npm run sync:safari-proxy`
after placing the shot under `shots/`). Bot cannot push.

Bot cannot push.

Exact PNG **bytes** from WebKit vary run-to-run (AA / font raster). `sync-safari-proxy-asset.mjs`
compares with **pixelmatch**; `DRIFTED=1` only when mismatchRatio ≥ `SAFARI_PROXY_DRIFT_RATIO`
(default **0.02**). Sub-threshold byte diffs keep tracked `docs/assets` and skip the issue.
Observed WebKit projector AA noise is often ~1–1.5%; 0.2% was too strict and reopened issues.


### pages-network 13.9s boot spike (2026-11-06)

`BOOT_SAMPLES=5` local probe against Pages:

| sample | bootMs |
|--------|--------|
| 1–3, 5 | ~2526–3690 |
| 4 | **13963** |

`bootMsP50≈2804`, `bootMsP95=13963`. Advisory threshold
`PAGES_NETWORK_ADVISORY_BOOT_MS` (default 12000) warns on **p95**, not a
single cold hit — one CDN edge spike would otherwise false-alarm or be missed
by a lucky single sample. Hard asserts remain jsCount / waterfall / factory
chunk only.

### Pages cold TTI (entry / main)

Measured on `otas0.github.io/immspfee` with SW blocked: cold ready often
**~1.5–6 s** depending on CDN; `__bootMarks.entryMs` + `mainMs` are usually
**&lt; 2 s** once bytes arrive (`entry.js` ~2 KB, `lab.js` ~80 KB gz transfer).
Further cuts are mostly **network / SW**, not more splitting of `entry.js`.
Prefer: keep factory off cold boot, keep handModels lazy, and avoid growing
`lab.js` cold path. Do not chase sub-second cold TTI on cold Pages edges.

2026-11-06 re-measure (SW blocked): cold ready **~4.8 s**,
`entryMs≈3.7 s`, `mainMs≈1.1 s`, first handModels switch **~4.5 s**.
`microCss` matched the commit; `bundleMeta` differed (Pages `build:bundle`
before `prepare-site` — expected). SW cache bumped to `immspfee-hashed-v6`;
`entry.js` adds `modulepreload` for `lab.js` (no further entry split).

When a write fails with `Operation not permitted`:

```bash
# one path
chflags nouchg path/to/file

# or clear the whole tree (last resort)
chflags -R nouchg .
```

### Lab server single-instance

`scripts/dev-server.mjs` writes `.lab-server.pid` (`pid port`). A second
bind on the same `PORT` exits. Before starting Playwright locally:

```bash
# if the pid file is stale after a crash
rm -f .lab-server.pid
# or stop the live process
kill "$(awk '{print $1}' .lab-server.pid)"
```

Do not trap `SIGHUP` to exit the server — agent / nohup launchers send it
when the parent shell closes and would kill mid-suite.

## stash `wip-other` (dropped 2026-11-06)

Audited and dropped. Strings / dialog errors / micro chrome keys were already on
`main`. Remaining hunks would have reverted the `factoryLoader` split and removed
the live oil-immersion WebGL path — rejected.
