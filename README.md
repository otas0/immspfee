# Lab · 演示实验室

纯前端演示实验室：**18 个模型**（物理 / 计算机科学 / 计算机工程）· 自定义参数工作台 · 黑白外壳 + 分模型语义彩绘。

## 领域对照

| 领域 | 模型 | 侧栏筛选 / 搜索 |
|------|------|-----------------|
| **物理** | 自由落体、斜抛、弹簧、单摆、碰撞、双摆、波、热传导、开普勒轨道、洛伦兹力 | tag `物理` · 搜索 `phy` |
| **计算机科学** | 排序算法（bubble/insertion/quick）、BFS/A* 寻路、生命游戏 | tag `计算机科学` · 搜索 `CS` |
| **计算机工程** | LRU 缓存、CPU 流水线、FIFO、RC 电路、RLC 振荡 | tag `计算机工程` · 搜索 `CE` |

> 原「计算机工程·物理」（RC/RLC）已并入 **计算机工程**。

## 启动

```bash
npm start
```

打开 http://127.0.0.1:8765/

### Connection refused？

浏览器报 `ERR_CONNECTION_REFUSED` 时，在项目目录重新启动：

```bash
cd ~/physics-demo && npm start
```

端口占用：`PORT=8766 npm start`。

## 测试

```bash
npm test              # 物理断言 + 参数工具 + CS/CE 冒烟
npm run test:pot      # Playwright：拖 pot 不爆表（需先 npm start）
npm run shots         # 8 张经典物理基线
npm run shots:extra   # 可选：扩展模型轻量截图 → shots/extra/
npm run baseline:update
npm run test:visual
npm run test:all
```

## 参数工作台

- 每个参数有显式 **min / max**；拖电位器 / 滑条 / 输入超界会钳制，并 toast 一次
- **− / +**：按量级步进；输入框 ↑↓ 同理（Shift = 大步进）
- **复位**：电位器 **双击** 或聚焦后按 **Home**
- **fixedDt** 友好显示为 `1/240`；也可输入 `1/120`
- 离散模型统一 **stepDt**（排序 / 寻路 / 生命 / 缓存 / 流水线 / FIFO）
- 拖滑条时暂停仿真，松手后恢复
- 非法自定义常量拒绝写入

## 说明

- 色板：[`data/palettes.json`](./data/palettes.json)；contrast 降饱和
- 截图：`sys → frame shot` / `shot readouts` / `shot legend`
- 窄屏：汉堡打开模型列表；宽屏三栏隐藏汉堡
- 自定义常量：见 [manual.html](./manual.html)
