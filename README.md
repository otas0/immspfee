# Lab · 演示实验室

纯前端学术演示实验室：**1500+ 模型**（手写/工厂精调 + 每族 1 条引擎条目；轴/参数进工作台而非侧栏克隆）· 统一 Model 接口 · Web/Canvas 可视化 · 高自定义参数工作台。

## 架构原则

对齐 [scikit-complexity](https://pypi.org/project/scikit-complexity/) 的 **catalog 分类 + 统一接口**，但可视化层用 **Web/Canvas 重实现**，不依赖 Python / Rerun：

| 借鉴 | 用在本项目 |
|------|------------|
| scikit-complexity | `catalog` + `family`/`formalism`；同一套 `init/step/draw/getReadouts/refresh` |
| PhET / oPhysics / SimuPhysics | 单模型交互：拖物距、读数对照、虚像虚线、刻度尺 |
| Algorithm Visualizer / eigenvue | CS：步进高亮、点选连边、网表拖线（思路复用，非嵌入其运行时） |
| 工程教学台 | **原理性可视化**（简化方程），非 FEA/SPICE/工业求解器，保持浏览器轻量 |

Fidelity 默认 `principle`。工厂族能力见 `js/lab/formalism.js`。

## 开发约束（死规则）

**每个模型必须可用。**

- `params` + `paramSchema`（group / 中文 label / unit / min·max）
- `init` / `step` / `draw` / `getReadouts` / `refresh`
- live/reset **完全以 `schema.group` 为准**（dynamics/display/custom=live；initial/numerics=reset）
- 合同测试全绿；失败写出 `artifacts/contract-failures.json`（含 failedModelIds）
- 可选：`onPointer`、`runAction`、`getEnergy`/`getEnergyAt`、`capabilities.actions`

## 万能壳

| 层 | 职责 |
|----|------|
| Catalog | `data/catalog.json`；侧栏领域/子类 |
| Shell | `deriveCapabilities`：formalism / hint / pointer / actions |
| Stage | 统一 canvas；透镜/Dijkstra/逻辑门走 pointer + 壳工具条 |
| Bench | schema 控件；≥20 参默认只展开 dyn |
| HUD | 多快照对照、导入/导出课堂对照卷 JSON、安全默认 |

## 族×维度扩库

模型族与变体维度定义在 [`scripts/family-defs.mjs`](./scripts/family-defs.mjs)（同步写出 [`data/families.json`](./data/families.json)）。生成器合并进 `catalog.json` / `models.json`，跳过已有 id，并为新 id 批量写领域色相色板：

```bash
npm run gen:families                 # 每缺失族补 1 条（唯一仿真引擎，不展开预设）
node scripts/dedupe-family-variants.mjs  # 折叠历史族×变体克隆（已跑过可跳过）
npm run gen:families -- --dry-run    # 只打印计数
npm run gen:families -- --max-per-family 20 --target 4000
```

生成条目 id 形如 `fam-<slug>-vNN`，`family` 映射现有 factory（ode1d / wave1d / ml / …）；运行时走薄 `variant` 构建器读取 `dims`/`defaults`。

## Live

GitHub Pages（project site）：**https://otas0.github.io/physics-demo/**

静态根目录由 `.github/workflows/pages.yml`（`actions/deploy-pages`）在 `main` 推送后发布；本地仍用相对路径 `./…`，与 `/physics-demo/` 前缀兼容。

## 启动与测试

```bash
npm start
npm test
npm run test:catalog
npm run report:schema          # → docs/schema-coverage.md
npm run test:contract-browser  # 按领域分层抽检（每域≥3）
CONTRACT_SAMPLE=800 npm test   # 大目录时可抽样合同（默认全量）
npm run test:all
```

覆盖率与交互说明见 [manual.html](./manual.html) · [docs/schema-coverage.md](./docs/schema-coverage.md)。

## 贡献入口：新增 factory family

新增一族可视化时，先读 **[docs/add-factory-family.md](./docs/add-factory-family.md)**（统一接口 · Canvas · 原理级保真），再用脚手架：

```bash
npm run new:family -- name=fluid
npm run new:family -- name=rcmesh --formalism=circuit
```

然后在 `data/catalog.json` 挂 `"family": "fluid"` 条目，并跑 `npm test`。

手写精调模型（`family: "hand"`）对照说明见 **[docs/hand-models.md](./docs/hand-models.md)**。

品牌字标 **IMMSPFEE**：`assets/immspfee-logo.webp`（优先）+ `.png` 回退，侧栏 `picture` 引用；SVG 外壳见 `assets/immspfee-logo.svg`。

## 参数与窄屏

- 宽量程 NaN →「恢复安全默认」
- 对照：钉住 / 存快照 / 切换 / **导出·导入 JSON**
- CSV 优先 `getEnergyAt(row)`，按轨迹点能量而非末态重复
- 折叠：按钮全开全收 + 点标题
