# 手写精调优先队列（示范批）

力学、电路、控制各一批已写入 `data/authority-templates.json` 的 `ids`，并标 `fidelity: engineering`（假设见 catalog）。

| 批 | id | 对照 |
|----|----|------|
| 力学 | `free-fall` `projectile` `inclined-plane` `spring` `pendulum` `collision` `collision-2d` `double-pendulum` `orbit` | Halliday / Hibbeler / Thornton & Marion / Goldstein |
| 电路 | `rc-circuit` `rlc` `rl-circuit` `ohms-law` `lorentz` | Nilsson；Griffiths Ch. 5 |
| 光学 | `polarization` `double-slit` `single-slit` `standing-wave` `photoelectric` | Hecht；Einstein |
| 控制 / 结构 | `pid-tune` `beam-sfd-bmd` | Åström & Murray；Hibbeler 梁 |
| 生理（伦理） | `hodgkin-huxley` | 1952 原文；见 [ethics-audit.md](./ethics-audit.md) |
| 算法 | `sorting` `bfs-grid` `dijkstra` `logic-gates` `cache-lru` `fifo` `avl-tree` `turing` `huffman` `crc-hamming` | CLRS / Sipser / Lin & Costello |

## 已完成（本轮）

- 课程批量 `r###` 薄壳已下架；目录约 **382**（hand + famPhysics + 命名独立模型）。
- 命名 `gauge` 占位已迁出；`familyFallback` 去掉 tree/compile/turing/comm/discrete/gauge 静默别名，未知族返回 `null`。
- P0/P1 手写：`polarization` `photoelectric` `ohms-law` `rl-circuit` `double-slit` `single-slit` `standing-wave`。
- CS 真手写补回：`avl-tree` `turing` `huffman` `crc-hamming`（不再挂二分/Nyquist fallback）。
- `sph-simple` 改名「SPH 核函数（中心值）」；`dfa-nfa` 升 Sipser 偶校验 DFA；`rl-grid` 保持 principle TD 示意（不升深度 RL）。
- CI：`assert:no-misbind`（⌊log₂ n⌋ 仅允许 `binary-search`）；palette gen 跳过已删 id，避免回流 `其他.json`。

## 下一队列

| 优先 | id | 理由 |
|------|-----|------|
| P1 | `bohr` | 能级图已有；可把手写轨道动画与 fam 量子阱对照 |
| P1 | `drag-fall` `circular-motion` | 力学补完；对照 `free-fall`/`projectile` |
| P2 | `bernoulli` `doppler` `lens` | 工程/声学/几何光学课堂常用 |
| P2 | `neutron-diffusion` | 保持 `principle`；升 `engineering` 条件见 catalog assumptions |
| P3 | 其余 principle standalone | 保持 topic 引擎即可，不强升手写 |

不要把 `gauge` 再加回自建白名单；自建仅挂 `verifiedUserFamilies`（见 `data/authority-templates.json`）。
