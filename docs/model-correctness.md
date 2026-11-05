# 模型正确性门禁（工业级）

> 硬规则：每个模型必须达到**工业可用示意/工程原理**标准——高自定义参数；创建前对照**权威学术文档**核对伦理与理论概念。不是「只为上课好看」。

## 创建前检查清单

| # | 检查 | 不通过则 |
|---|------|----------|
| 1 | 写出支配方程 / 算法不变量，与教材或标准章节对应 | 禁止入库 |
| 2 | 列出适用假设与失效边界 | 禁止标 `engineering` |
| 3 | `paramSchema` ≥ 4 项，含 unit / min·max / group | 补全后再合并 |
| 4 | 状态量、读数标签与方程符号一致 | 改名或改方程 |
| 5 | 生物/化学/核等：仅公开教学方程，无合成/武器路径 | 删除能力 |
| 6 | 与已有同名概念模型做对照（防重复错误类比） | 合并或标注差异 |

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

## 与「原理级」的关系

历史文案曾写「非 FEA/SPICE」。现策略：

- 默认可标 `engineering`（工程可用示意），但**必须**写清假设  
- 仅当故意简化时用 `principle`，HUD/描述须标明非工业求解器  
- **禁止**用 principle 当借口交付错误物理/错误算法  
