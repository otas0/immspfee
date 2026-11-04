# Physics Lab

纯前端物理演示：8 个模型 · 自定义参数工作台 · 纯黑白界面。

## 启动

```bash
npm start
```

打开 http://127.0.0.1:8765/

## 测试

```bash
npm test              # 物理断言
npm run shots         # 抓 8 张纯画布基线（需先 npm start）
npm run baseline:update
npm run test:visual   # SHA-256 + 像素 diff
npm run test:all
```

## 说明

- 参数工作台：双击电位器复位；方向键按量级步进（界面显示 `±step`）
- 截图：`sys → frame shot` / `shot readouts`
- 自定义常量：见 [manual.html](./manual.html)
