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
