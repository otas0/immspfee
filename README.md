# Lab · 演示实验室

纯前端学术演示实验室：**1300+ 模型**（物理 / CS / CE / 工程学科扩展表 110×10 + 专项精调）· 子类侧栏 · 自定义参数工作台 · 黑白外壳 + 分模型语义彩绘。

## 开发约束（死规则）

**每个模型必须可用。** 注册进目录的模型一律满足：

- `params` + `paramSchema`（含 group / label / unit / min·max）
- `init` / `step` / `draw` / `getReadouts` / `refresh`
- 改参后 HUD 与画布立即响应（`dyn`=live，`init`/`num`=重置）
- 合同测试 `js/tests/model-contract.js` 全绿；失败时写出 `artifacts/contract-failures.json`（含 **failedModelIds** 清单）
- 可选：`onPointer`、`getEnergy`、`getTrajectory`、`capabilities`（万能壳据此自适应）

新增模型未过合同测试，不得合入。

## 万能壳：多模型同一站点

同一套 **chassis**（侧栏目录 · 画布舞台 · 参数工作台），用能力协议适配任意模型，而不是为每个模型做一套 UI：

| 层 | 职责 |
|----|------|
| Catalog | `data/catalog.json` + 工厂/手写注册；侧栏折叠按领域/子类 |
| Shell | `js/ui/modelShell.js` → `deriveCapabilities`：interaction / hint / pointer / energy |
| Stage | 统一 canvas；有 `onPointer` 时启用拖点/连边/拖线 |
| Bench | 同一旋钮/文本/下拉台；参数多时自动折叠非 dyn 组 |
| HUD | 读数对照、多快照基线切换、安全默认恢复 |

高自定义参数靠：schema 驱动控件 + 宽量程文本输入 + ADD 自定义常量 + 全局 sys（dt / 向量 / 对照）。画布交互只声明 `capabilities`，壳负责呈现。

## 领域对照

| 领域 | 覆盖子类（节选） | 侧栏 / 搜索 |
|------|------------------|-------------|
| **物理** | 经典力学、流体、波与振动、热力学、电磁学、光学、近代物理、天体物理 | tag `物理` · 搜索 `phy` |
| **计算机科学** | 算法与数据结构、计算理论、密码学、信息论、机器学习、优化 | tag `计算机科学` · 搜索 `CS` |
| **计算机工程** | 数字逻辑、体系结构、嵌入式、通信、网络、操作系统、编译、数据库、分布式 | tag `计算机工程` · 搜索 `CE` |

完整目录见 [`data/catalog.json`](./data/catalog.json)。手写精调模型 + 工厂教学可视化合并注册。

## 启动

```bash
npm start
```

打开 http://127.0.0.1:8765/

端口占用：`PORT=8766 npm start`。

## 测试

```bash
npm test                 # 物理断言 + 目录规模 + 模型合同（失败写 artifacts/）
npm run test:pot         # Playwright：拖 pot 不爆表（需先 npm start）
npm run test:contract-browser  # Playwright draw 像素抽检（需先 npm start）
npm run report:schema    # 中文 schema 覆盖率 → artifacts/schema-coverage.md
npm run shots
npm run shots:extra
npm run baseline:update
npm run test:visual
npm run test:all
```

## 参数工作台

- **live vs reset**：`dyn` 带 `live` 标记立即生效；`init` / `num` 与强制键会 `init()` 重置（见 [manual.html](./manual.html)）
- 顶部固定「万能工作台」能力条；改参立即 refresh
- 每个参数有显式 **min / max**；宽量程开时文本可超界，NaN 时出现「恢复安全默认」
- 离散 `algo` / `mode` / `hazardMode` 等为**下拉**
- **− / +**、↑↓、电位器双击 / Home 复位
- 拖旋钮暂停；`blur` / `pointercancel` / `touchcancel` 强制恢复播放
- 对照基线：钉住 / 存快照 / 下拉切换多快照
- CSV：按轨迹点字段插值 `getEnergy`，不整表重复末态
- 调试：`localStorage.physics-lab-debug-params=1`

## 窄屏折叠栏

- **按钮**：侧栏顶「全部展开 / 全部收起」一键改领域与子类
- **手势**：点领域 / 子类 `<summary>` 单独开合；状态写入 `localStorage`（`physics-lab-folds-v1`）
- **抽屉**：≤900px 汉堡开模型列表、params 开工作台；侧栏左右拖、工作台上下拖（橡皮筋）与按钮并存，互不替代

## 说明

- 色板：[`data/palettes.json`](./data/palettes.json)；未登记模型自动合成色相
- 自定义常量：见 [manual.html](./manual.html)
- 交互示例：透镜拖动物体 · Dijkstra 点选连边 · 逻辑门网表拖线
