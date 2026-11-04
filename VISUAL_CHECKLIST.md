# Visual regression

## 裁切规范
- **纯画布**：`shots/0N-*.png` = `#canvas` 的 `toDataURL`，黑底 + **分模型语义彩绘**，不含侧栏/工具栏。
- **色板源**：`data/palettes.json`（`js/utils/theme.js` 加载）；`html.hc` 时降饱和。
- **尺寸**：随 DPR 变化；对比用 SHA-256（`shots/baseline/manifest.json`）。
- **抓取**：`npm start`（另开终端）→ `npm run shots`。
- **更新基线**：`npm run baseline:update`。
- **验收导出**：`shots/export-framed-readouts.png`（frame + readouts）；可选 `shot legend` 烧录色板图例。

## 模型色意速查

| # | model | file | 画布要点 |
|---|-------|------|----------|
| 1 | free-fall | 01-free-fall.png | 琥珀球 + 青绿速度 |
| 2 | projectile | 02-projectile.png | 橙轨迹；vx 绿 / vy 蓝；**灰蓝理论虚线** |
| 3 | spring | 03-spring.png | 玫红质量块 + 青绿弹簧 |
| 4 | pendulum | 04-pendulum.png | 橙摆球 + 靛杆 |
| 5 | collision | 05-collision.png | **蓝 m1 / 红 m2** + 角标图例 |
| 6 | double-pendulum | 06-double-pendulum.png | 紫/粉质点；**底部色相图例条** |
| 7 | wave | 07-wave.png | 青波形；**正暖 / 负冷填充** |
| 8 | heat | 08-heat.png | 蓝冷→红热色标，标注 **冷/热** |

## UI 呼应
- 侧栏模型项左侧色点 = `swatch`
- HUD readout 左边条 + 右上角点 = 当前模型 `body`
- sys → `shot legend`：PNG 导出附色板图例
- 侧栏 tag 可筛：`物理` / `计算机科学` / `计算机工程` / `计算机工程·物理`

## 扩展模型（不纳入 8 张视觉基线）
开普勒轨道、洛伦兹力、冒泡排序、BFS 寻路、生命游戏、LRU 缓存、CPU 流水线、FIFO 缓冲、RC 电路、RLC 振荡 —— 见 `data/models.json`。

```bash
npm test              # 物理 + 参数工具单测
npm run test:pot      # 拖 pot 不爆表（需服务）
npm run test:visual   # 8 张哈希对比（经典物理集）
npm run test:all
```
