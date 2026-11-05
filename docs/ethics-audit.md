# 伦理敏感族审计

公开教学方程可以演示。禁止增强、合成、武器化、临床给药或堆芯设计路径。

| 族 / 模型 | 文献边界 | 实验室做法 | 禁止 |
|-----------|----------|------------|------|
| Hodgkin–Huxley `hodgkin-huxley` | Hodgkin & Huxley, J. Physiol. 117:500 (1952) | 空间钳位电导 ODE，参数可对照原文 | 药物筛选、刺激优化、临床方案 |
| 核工程 `reactor` / `decay` | Lamarsh & Baratta 点堆；Krane 指数衰变 | 教科书点堆与衰变曲线，`fidelity: principle` | 临界设计、燃料循环、剂量武器化 |
| 化工 `cstr` 等反应条目 | Fogler, Elements of Chemical Reaction Engineering（集总衡算） | 质量/能量衡算示意，须读 assumptions | 危险工艺放大、未公开配方合成 |
| 密码 `crypto` | Katz & Lindell 公开原语章节 | 步骤可视化 | 攻击实现、密钥恢复 |

原先挂在 `gauge` 上的正弦占位已改为按条目名称积分公开教科书关系（`js/lab/topicModel.js`）。核、药代、HH 稳态分压只保留定义式，不提供设计或给药路径。

权威字段见 catalog 的 `authority` / `assumptions`。壳层芯片区分 `engineering` 与 `principle`。
