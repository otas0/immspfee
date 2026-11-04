# 如何新增一个 factory family

对齐 scikit-complexity：**同一套 Model API**，可视化用 Canvas。工程模型保持 **原理级**（简化方程），不要接工业求解器。

## 1. 在 `js/models/factory.js` 增加 builder

```js
function buildMyFamily(spec) {
  return {
    ...baseMeta(spec),
    capabilities: { /* 可选，enrich 会用 familyCapabilities 补 */ },
    params: { k: 1, n: 10 },
    paramSchema: {
      k: schemaNum('刚度 k', 'dynamics', 'N/m', 0.01, 100),
      n: schemaNum('点数 n', 'numerics', '—', 4, 64),
    },
    init(state) { state.t = 0; /* … */ },
    step(state, dt) { state.t += dt; /* 简化方程 */ },
    draw(ctx, state, view) { title(ctx, spec.name); /* Canvas */ },
    getReadouts(state) { return [{ label: 't', value: String(state.t) }]; },
    // 可选
    // onPointer(state, ev) { … }
    // runAction(state, id) { … }
    // getEnergy / getEnergyAt / getTrajectory
  };
}
```

在 `createFactoryModel` 的 `builders` 表注册：`myfamily: buildMyFamily`。

## 2. 在 `js/lab/formalism.js` 登记元数据

```js
myfamily: {
  formalism: 'ode',          // 侧栏 form 筛选
  viz: 'phet-particle',      // 交互原型标签
  hint: '一句话教学提示',
},
```

`formalism` 常见值：`ode` · `network` · `circuit` · `optics` · `discrete` · `field` · `pde` · …

## 3. 在 `data/catalog.json` 挂条目

```json
{
  "id": "my-demo",
  "name": "我的示意",
  "domain": "物理",
  "sub": "经典力学",
  "family": "myfamily",
  "formula": "x'' = -k x",
  "description": "原理级示意"
}
```

`family` 必须与 builders 键一致。手写精调用 `"family": "hand"` 并在 `js/models/` 实现（对照 [hand-models.md](./hand-models.md)）。

脚手架可指定 formalism：

```bash
npm run new:family -- name=rcmesh --formalism=circuit
```

## 4. 交互约定（不必从零设计 UI）

| 方向 | 借鉴 | 做法 |
|------|------|------|
| 物理 | PhET / oPhysics | 声明 `onPointer`，拖约束点 |
| CS | Algorithm Visualizer | `runAction('step')` + 高亮 |
| 工程 | 教学台 | `fidelity: 'principle'`，HUD 标明非 FEA |

壳（`modelShell` / 工作台 / HUD）自动适配，**不要**为每个模型新开页面。

## 5. 验收

```bash
npm test
npm run report:schema          # zh-label / unit ≥ 99%
npm start & npm run test:contract-browser
```

死规则：`init/step/draw/getReadouts/refresh` 齐备；改参后立即可用。
