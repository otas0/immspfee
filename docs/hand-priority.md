# 手写精调优先队列（示范批）

力学、电路、控制各一批已写入 `data/authority-templates.json` 的 `ids`，并标 `fidelity: engineering`（假设见 catalog）。

| 批 | id | 对照 |
|----|----|------|
| 力学 | `free-fall` `projectile` `inclined-plane` `spring` `pendulum` `collision` `collision-2d` `double-pendulum` `orbit` | Halliday / Hibbeler / Thornton & Marion / Goldstein |
| 电路 | `rc-circuit` `rlc` `lorentz` | Nilsson；Griffiths Ch. 5 |
| 控制 / 结构 | `pid-tune` `beam-sfd-bmd` | Åström & Murray；Hibbeler 梁 |
| 生理（伦理） | `hodgkin-huxley` | 1952 原文；见 [ethics-audit.md](./ethics-audit.md) |
| 算法 | `sorting` `bfs-grid` `dijkstra` `logic-gates` `cache-lru` `fifo` | CLRS / Mano / Hennessy |

下一队列：把仍挂 `gauge` 且公式明确的条目（如偏振 Malus）改挂专用 family，而不是继续用占位量表。
