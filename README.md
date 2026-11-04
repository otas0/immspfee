# Physics Lab

纯前端演示实验室：**18 个模型**（物理 / 计算机科学 / 计算机工程 / 计算机工程·物理）· 自定义参数工作台 · 黑白外壳 + 分模型语义彩绘。

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
npm test              # 物理断言 + 参数工具单测
npm run test:pot      # Playwright：拖 pot 不爆表（需先 npm start）
npm run shots         # 抓 8 张纯画布基线（需先 npm start）
npm run baseline:update
npm run test:visual   # SHA-256 + 像素 diff
npm run test:all
```

## 参数工作台

- 每个参数有显式 **min / max**（见各模型 `paramSchema`）；拖电位器 / 滑条 / 输入超界会钳制，并 toast 一次
- **− / +**：按量级步进；输入框 ↑↓ 同理（Shift = 大步进）
- **复位**：电位器 **双击** 或聚焦后按 **Home**（有闪光反馈）
- **fixedDt** 友好显示为 `1/240`；也可直接输入 `1/120`
- 拖滑条 / 电位器时 **暂停仿真**，松手后恢复
- 窄屏：sys / add / presets 默认折叠，dyn 展开
- 非法自定义常量（坏 key、非有限值、超大数、不安全表达式）**拒绝写入**

## 说明

- 画布按模型着色（色板见 [`data/palettes.json`](./data/palettes.json)）；UI 外壳仍为黑白；contrast 降饱和
- 截图：`sys → frame shot` / `shot readouts` / `shot legend`（导出固定 2× DPR，随后恢复屏幕 DPR）
- 窄屏：汉堡打开模型列表；点遮罩关闭；宽屏三栏不显示汉堡
- 自定义常量：见 [manual.html](./manual.html)
