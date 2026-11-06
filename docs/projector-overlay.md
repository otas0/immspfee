# Lab Projector overlay vs stage width

When the catalog opens as a `position:fixed` overlay, it leaves CSS grid flow.
Without pinning `.chassis.shell-hide-sidebar > .stage { grid-column: 2 }` (compact: `1`),
auto-placement puts the stage into the leading `0` track and the stage collapses
to width 0 — a white / empty projector surface.

## Reference shots

Local / CI artifacts (gitignored under `shots/`, uploaded as `shell-chrome-screenshots-<sha>`):

| State | Shot |
| --- | --- |
| Closed (1000×800) | [`shots/shell-projector-1000.png`](../shots/shell-projector-1000.png) |
| Overlay open, stage intact | [`shots/shell-projector-1000-overlay.png`](../shots/shell-projector-1000-overlay.png) |
| Wide overlay (1440) | [`shots/shell-projector-1440-overlay.png`](../shots/shell-projector-1440-overlay.png) |
| RTL + safe-area mock | [`shots/shell-projector-1000-rtl-safe.png`](../shots/shell-projector-1000-rtl-safe.png) |
| WebKit proxy (Safari stand-in) | [`shots/shell-projector-1000-safari-proxy.png`](../shots/shell-projector-1000-safari-proxy.png) |

Asserted by `npm run test:shell` (`menuHitTest`, Escape close, catalog scroll, stageW ≥ 700 with overlay).

## Menu above dimmer

`#btn-menu` / `#btn-params` use `position: fixed; z-index: 70` while the drawer/overlay
is open so they escape the `.stage` stacking context and stay clickable above the
backdrop (`z-index: 24`) and overlay catalog (`z-index: 60`).

## RTL overlay edge

**Product decision:** keep the projector catalog overlay on the **physical left**
(`left: 0`) even when `dir="rtl"`. Mirroring to `right: 0` covers the toolbar menu,
which RTL layouts place on the inline-end (right). Menu/params stay
`position: fixed; z-index: 70` above the dimmer; catalog text still flows RTL inside
the left dock.
