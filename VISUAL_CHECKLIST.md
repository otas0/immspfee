# Visual regression

## 裁切规范
- **纯画布**：`shots/0N-*.png` = `#canvas` 的 `toDataURL`，黑底 OLED，不含侧栏/工具栏。
- **尺寸**：随 DPR 变化；对比用 SHA-256（`shots/baseline/manifest.json`）。
- **抓取**：`npm start`（另开终端）→ `npm run shots`。
- **更新基线**：`npm run baseline:update`。
- **验收导出**：`shots/export-framed-readouts.png`（frame + readouts）。

| # | model | file |
|---|-------|------|
| 1 | free-fall | 01-free-fall.png |
| 2 | projectile | 02-projectile.png |
| 3 | spring | 03-spring.png |
| 4 | pendulum | 04-pendulum.png |
| 5 | collision | 05-collision.png（m1 实心 / m2 线框） |
| 6 | double-pendulum | 06-double-pendulum.png |
| 7 | wave | 07-wave.png |
| 8 | heat | 08-heat.png |

```bash
npm test              # 11 物理断言
npm run test:visual   # 8 张哈希对比
npm run test:all
```
