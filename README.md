# Lab · 演示实验室

纯前端学术演示实验室：**219 个模型**（物理 / CS / CE + 材料·热工·电子·控制·航宇·水利·交通·化工·工业·核·生医·环境·数理化生地经管）· 子类侧栏 · 自定义参数工作台 · 黑白外壳 + 分模型语义彩绘。

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
npm test              # 物理断言 + 目录规模 + live g + CS/CE 冒烟
npm run test:pot      # Playwright：拖 pot 不爆表（需先 npm start）
npm run shots
npm run shots:extra
npm run baseline:update
npm run test:visual
npm run test:all
```

## 参数工作台

- **live vs reset**：`dyn` 带 `live` 标记立即生效；`init` / `num` 与强制键会 `init()` 重置（见 [manual.html](./manual.html)）
- 顶部固定「应用到模型」说明条
- 每个参数有显式 **min / max**；超界钳制并 toast
- 离散 `algo` / `mode` / `hazardMode` 等为**下拉**
- **− / +**、↑↓、电位器双击 / Home 复位
- 拖旋钮暂停；`blur` / `pointercancel` / `touchcancel` 强制恢复播放
- 改参后 readout 高亮对照；调试：`localStorage.physics-lab-debug-params=1`（120ms 防抖日志）

## 说明

- 色板：[`data/palettes.json`](./data/palettes.json)；未登记模型自动合成色相
- 窄屏：汉堡开模型列表；工作台底部 ADD/PRESETS 留白防遮挡
- 自定义常量：见 [manual.html](./manual.html)
