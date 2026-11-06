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
