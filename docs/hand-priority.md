# 手写精调优先队列（示范批）

力学、电路、控制各一批已写入 `data/authority-templates.json` 的 `ids`，并标 `fidelity: engineering`（假设见 catalog）。

| 批 | id | 对照 |
|----|----|------|
| 力学 | `free-fall` `projectile` `inclined-plane` `spring` `pendulum` `collision` `collision-2d` `double-pendulum` `orbit` | Halliday / Hibbeler / Thornton & Marion / Goldstein |
| 电路 | `rc-circuit` `rlc` `rl-circuit` `ohms-law` `lorentz` | Nilsson；Griffiths Ch. 5 |
| 控制 / 结构 | `pid-tune` `beam-sfd-bmd` | Åström & Murray；Hibbeler 梁 |
| 生理（伦理） | `hodgkin-huxley` | 1952 原文；见 [ethics-audit.md](./ethics-audit.md) |
| 算法 | `sorting` `bfs-grid` `dijkstra` `logic-gates` `cache-lru` `fifo` | CLRS / Mano / Hennessy |

## 已完成（本轮）

- 课程批量 `r###` 薄壳已下架；目录仅保留完成集（hand + famPhysics + 命名独立模型，~413）。
- 命名 `gauge` 占位已迁出；全部 `fam-*` 已离开 `family:gauge`（辐射→cycle、偏振→interference、激光→rays 等）。
- P0 手写已落地：`polarization` `photoelectric` `ohms-law` `rl-circuit`（`family:hand`）。
- 弱交互 `matrix-transform` 已下架；经济类 `supply-demand` / `compound-growth` 已删。
- `buildGauge` 不再提供装饰性正弦回退；自建对话框只渲染 `USER_MODEL_FAMILIES`。

## 下一队列：standalone → hand 升写优先序

从剩余命名独立模型中，按「课堂高频 × 手写交互收益」排序（先于再扩 fam 变体）：

| 优先 | id | 理由 |
|------|-----|------|
| P1 | `double-slit` `single-slit` `standing-wave` | 光学/波动高频；现有 interference/wave1d 可升密度 |
| P1 | `bohr` | 能级图已有；可把手写轨道动画与 fam 量子阱对照 |
| P1 | `drag-fall` `circular-motion` | 力学补完；对照 `free-fall`/`projectile` |
| P2 | `bernoulli` `doppler` `lens` | 工程/声学/几何光学课堂常用 |
| P2 | `neutron-diffusion` | 保持 `principle`；升 `engineering` 条件见 catalog assumptions（多群截面、外推边界、教材数值对拍） |
| P3 | 其余 principle standalone | 保持 topic 引擎即可，不强升手写 |

不要把 `gauge` 再加回自建白名单；自建仅挂 `verifiedUserFamilies`（见 `data/authority-templates.json`）。
