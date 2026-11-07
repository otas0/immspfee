# Lab Projector overlay vs stage width

When the catalog opens as a `position:fixed` overlay, it leaves CSS grid flow.
Without pinning `.chassis.shell-hide-sidebar > .stage { grid-column: 2 }` (compact: `1`),
auto-placement puts the stage into the leading `0` track and the stage collapses
to width 0 — a white / empty projector surface.

## Reference shots

Local / CI artifacts (gitignored under `shots/`, uploaded as `shell-chrome-screenshots-<sha>` via `shots/shell-*.png`):

| State | Shot |
| --- | --- |
| Closed (1000×800) | [`shots/shell-projector-1000.png`](../shots/shell-projector-1000.png) |
| Overlay open, stage intact | [`shots/shell-projector-1000-overlay.png`](../shots/shell-projector-1000-overlay.png) |
| Wide overlay (1440) | [`shots/shell-projector-1440-overlay.png`](../shots/shell-projector-1440-overlay.png) |
| RTL + safe-area mock | [`shots/shell-projector-1000-rtl-safe.png`](../shots/shell-projector-1000-rtl-safe.png) |
| WebKit proxy (Safari stand-in) | [`shots/shell-projector-1000-safari-proxy.png`](../shots/shell-projector-1000-safari-proxy.png) — CI uploads `webkit-safari-proxy-<sha>`; tracked copy [`docs/assets/shell-projector-1000-safari-proxy.png`](./assets/shell-projector-1000-safari-proxy.png) for manual.html |
| Microscope 390 full-bleed | [`shots/shell-micro-390.png`](../shots/shell-micro-390.png) (also `docs/assets/shell-micro-390.png` for manual.html) |

Asserted by `npm run test:shell` (`menuHitTest`, Escape close, catalog scroll, stageW ≥ 700 with overlay).

## Menu above dimmer (Projector only)

**Projector overlay** (`shell-hide-sidebar.shell-sidebar-overlay`): `#btn-menu` /
`#btn-params` use `position: fixed; z-index: 70` so they escape the `.stage`
stacking context and stay clickable above the backdrop (`z-index: 24`) and
overlay catalog (`z-index: 60`). Catalog clears the toolbar band with
`top: var(--projector-overlay-top)` / `3.75rem`.

**Classic phone drawer** (`≤900`, not projector): do **not** apply
`position: fixed` to menu/params. Raising the whole `.toolbar` or fixing those
buttons stacked Play/Reset/formula over the catalog (“全叠在一起”). Classic rules:

| Layer | z-index | Notes |
| --- | --- | --- |
| Backdrop | 24 | Dimmer |
| Toolbar (in stage) | 32 | Above backdrop; below open sidebar |
| Open `.sidebar` | 45 | Opaque; `top` clears toolbar band |
| `#btn-menu` / `#btn-params` (relative) | 50 | Stay in toolbar band only |
| `.lab-toast` | 90 | Above drawer + sticky `.sidebar-foot` |

Asserted by `npm run test:narrow` (390 stack hit-test) and
`npm run test:pages-mobile` (open-menu + tablet 1000 z-order).

## RTL overlay edge

**Product decision:** keep the projector catalog overlay on the **physical left**
(`left: 0`) even when `dir="rtl"`. Mirroring to `right: 0` covers the toolbar menu,
which RTL layouts place on the inline-end (right). Menu/params stay
`position: fixed; z-index: 70` above the dimmer; catalog text still flows RTL inside
the left dock.
