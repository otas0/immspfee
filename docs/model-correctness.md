# 模型正确性门禁（工业级）

> Hard rule: every model must be an **industrial-grade teaching / engineering sketch** — rich customizable parameters; verify ethics and theory against **authoritative sources** before merge. Not “pretty classroom animation.”
>
> **No fake data:** every readout, plot point, and export must come from the model’s governing equation or algorithm with user-editable params. No decorative canned traces, placeholder constants, or invented “demo” numbers. Catalog `assumptions` / `fidelity` stay in metadata for audits — **do not** render ENGINEERING / assumption banners on the stage UI.

## Pre-merge checklist

| # | Check | If fail |
|---|------|----------|
| 1 | Write governing equation / algorithm invariant; map to textbook or standard | Block merge |
| 2 | List assumptions & failure bounds in catalog metadata (not UI chrome) | Do not mark `engineering` |
| 3 | `paramSchema` ≥ 4 keys with unit / min·max / group; all knobs customizable | Complete before merge |
| 4 | State vars & readout labels match equation symbols; values are real (not fake) | Rename or fix equation |
| 5 | Bio/chem/nuclear: public teaching equations only; no synthesis/weapon paths | Remove capability |
| 6 | Diff against existing same-concept models (avoid wrong analogies) | Merge or document difference |

## 权威来源示例（非穷尽）

- 力学：Goldstein / Landau / Hibbeler；ISO / ASME 相关章节
- 电路：Nilsson / Sedra-Smith；IEC 集总假设
- 控制：Ogata / Franklin；经典 PID / 根轨迹推导
- 算法：CLRS / Sedgewick；复杂度与不变量
- 化工：Fogler；质量/能量衡算边界

## 老师反馈：不 match 的处理

1. 在 issue / PR 标明 `correctness` + 模型 id  
2. 对照权威文档：方程错 → 修或下架；仅可视化弱 → 修 draw/readouts  
3. 工厂族大面积错误 → 在 `formalism.js` hint 标明局限，必要时拆 family  
4. 自建模型：侧栏「＋ 自建模型」强制 `authority` / `assumptions` / 伦理勾选  

## 自建模型

- 存储：`localStorage` 键 `immspfee-user-models-v1`  
- 校验：`js/lab/userModels.js` → `validateUserModelDraft`  
- 运行：挂接现有 factory family（非空壳动画）  

## 工厂条目

非手写模型一律经 `js/lab/topicModel.js`：按「学科 · 主题」或公式关键字积分该概念的标准关系（运动学、碰撞恢复系数、欧姆定律、Malus、开普勒、CSTR 一级转化率等），不再共用一条正弦或落体。读数符号与方程一致。核、药代、激光阈值等只保留公开定义式，并在 assumptions 里写明不是设计工具。

手写 25 个模型仍走各自的 `js/models/*` 实现。

## Principle vs engineering (metadata only)

- Prefer `engineering` when assumptions are documented in catalog metadata
- Use `principle` only for intentional simplifications — still no fake data
- **Never** paint fidelity / assumption / “not a design tool” banners on the stage UI
- **Never** use `principle` as an excuse for wrong physics or wrong algorithms

