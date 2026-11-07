# Parallel Agents / race lock

Two Agents Windows on this tree have repeatedly raced `js/main.js`, `css/styles.css`, `scripts/shell-chrome.mjs`, and `js/bundle/*`. Follow this before editing:

## Rules

1. **One writer.** Close any second Agents Window before touching this repo. Do not set macOS `uchg` on lab files.
2. **Park foreign dirt.** If `git status` shows unexpected WIP you did not write, stash it with a dated message (`race-dirt-park-HHMMSS`) before your edit — do not discard another agent’s work silently.
3. **Atomic rewrite + immediate commit.** For hot files (`shell-chrome.mjs`, `styles.css`, `main.js`), patch then `git add` + commit in the same shell turn so a peer cannot overwrite the buffer before HEAD moves.
4. **Bundle ownership.** Whoever changes `js/main.js` / shells / models / i18n must run `npm run build:bundle` and commit `js/bundle/*` in the same push.
5. **No force-push to main.** Rebase or merge; never overwrite Pages history.
6. **Drawer vs projector.** If both a microscope/WebKit agent and a mobile-drawer agent touch `css/styles.css`, rebase (or merge main) before push — never clobber classic phone drawer z-index with projector `position:fixed` menu/params (see `docs/projector-overlay.md`).

## Hot paths (serialize)

| Path | Why |
| --- | --- |
| `css/styles.css` | Drawer stack + micro3d pin + projector overlay |
| `css/microscope-shell.css` | Microscope chrome only |
| `js/main.js` | Sidebar pin / catalog paint |
| `js/viz/microscope*.js` | WebGL mesh + camera |
| `scripts/shell-chrome.mjs` | Playwright chrome contracts |
| `scripts/micro-*.mjs` | Magenta / oil / camera / promo |
| `js/bundle/*` | Hashed deploy outputs |

## Recovery

```bash
# If writes fail with Operation not permitted:
chflags nouchg path/to/file

# Park concurrent dirt:
git stash push -u -m "race-dirt-park-$(date +%H%M%S)" -- <paths>

# Confirm pin after sidebar work:
# #micro3d-host must stay outside #model-list; list scroll must not move host top.
```
