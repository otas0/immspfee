# 手写 hand 模型对照

工厂族（`js/models/factory.js` + `data/catalog.json` 的 `family`）覆盖大多数原理级示意。需要更高交互密度或定制方程时，用 **`family: "hand"`** 并在 `js/models/` 实现完整 Model。

## 与 factory 对照

| | factory family | hand |
|--|----------------|------|
| 入口 | `createFactoryModel(spec)` | `js/models/<id>.js` 导出，挂到 `js/models/index.js` 的 `handcrafted` |
| catalog | `"family": "ode1d"` 等 | `"family": "hand"`，`id` 与实现一致 |
| 能力 | `formalism.js` 的 `FAMILY_META` | 模型自带 `capabilities` |
| 交互 | 多数 knobs；部分 builder 含 `onPointer` | 自由声明 `onPointer` / `runAction` / `shouldPauseApp` |

## 能力对照（pointer / actions / energy）

| 能力 | factory 默认 | hand 典型做法 | 例 |
|------|--------------|---------------|-----|
| `onPointer` | 少数 builder（`rays`/`lens`、部分 graph）声明 | 按需实现拖放、画墙、连边 | `projectile` 拖球；`bfs-grid` 右键画墙；`dijkstra` 点边 |
| `capabilities.actions` + `runAction` | 部分离散/图族有 `step` | 工具条动作 + 快捷键 | `sorting` step；`logic-gates` undo/redo；`projectile` launch |
| `getEnergy` / `getEnergyAt` | `enrich` 按态量启发式补齐 | 手写精确动能/势能 | `spring` / `free-fall`；CSV 用 `getEnergyAt(row)` |
| `getTrajectory` | enrich 从 trail/hist/wave 推断 | 自定义轨迹点字段 | 对照能量表、导出 |
| `shouldPauseApp` | 无 | 课堂模式暂停全局时钟 | `sorting` demo=1 |
| `fidelity` | 恒 `principle` | 可自声明；壳显示徽章 | 工程示意「非 FEA」 |
| low-ink 加粗 | [`data/principle-low-ink.json`](../data/principle-low-ink.json) 命中则加粗 | **hand 与 factory 走同一张表**（`js/lab/lowInkIds.js` → `applyLowInkStrokeBoost`） | `pid-tune`、`logic-gates`、`rc-circuit`… |

墨点门槛与 CI：`npm run test:contract-browser` 后 `npm run gen:low-ink` 收紧表；未登记的 ink&lt;1% id 会令合同失败。

壳（`deriveCapabilities`）只读已声明能力，**不必**为 hand 另开页面。

## 最小清单

实现须具备：`params` · `paramSchema` · `init` · `step` · `draw` · `getReadouts` ·（建议）`refresh`。

可选：`onPointer`、`runAction`、`getEnergy` / `getEnergyAt`、`getTrajectory`、`shouldPauseApp`。

## 参考实现（对照阅读）

- 抛体拖放 + 再发射：`js/models/projectile.js`
- 弹簧 / 自由落体拖拽：`js/models/spring.js` · `freeFall.js`
- 课堂步进 + 暂停时钟：`js/models/sorting.js`
- 网格搜索右键墙：`js/models/bfsGrid.js`
- 网表连线撤销/重做：`js/models/logicGates.js`
- 图算法点击边：`js/models/dijkstra.js`

脚手架仍只生成 factory 族；hand 模型请复制上表中最接近的文件改 `id` / 方程，并在 `index.js` 注册。
