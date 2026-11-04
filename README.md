# Physics Lab

纯前端物理演示：8 个模型 · 自定义参数工作台 · 纯黑白界面。

## 启动

```bash
npm start
```

打开 http://127.0.0.1:8765/

### Connection refused？

浏览器报 `ERR_CONNECTION_REFUSED` / 进不去时，说明 **8765 没有进程在听**（服务没起或已退出）。在项目目录重新启动并保持终端不关：

```bash
cd ~/physics-demo && npm start
```

确认输出类似：`physics-demo http://127.0.0.1:8765`。若端口被占用：`PORT=8766 npm start`。

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
- 截图：`sys → frame shot` / `shot readouts`（导出固定 2× DPR，随后恢复屏幕 DPR）
- 窄屏：汉堡打开模型列表；点遮罩关闭；宽屏三栏不显示汉堡
- 自定义常量：见 [manual.html](./manual.html)
