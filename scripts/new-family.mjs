#!/usr/bin/env node
/**
 * 脚手架：npm run new:family -- name=fluid
 * 可选：--formalism=circuit 写入 FAMILY_META
 * 在 factory.js / formalism.js 插入占位，并写 docs 提示。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.find((a) => a.startsWith('name='))
  || process.argv.find((a, i) => process.argv[i - 1] === '--name');
const raw = (arg || '').replace(/^name=/, '').replace(/^--name=?/, '') || process.argv[2];
const name = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
if (!name || name === 'name') {
  console.error('用法: npm run new:family -- name=fluid [--formalism=circuit]');
  process.exit(1);
}

const formArg = process.argv.find((a) => a.startsWith('--formalism='))
  || process.argv.find((a) => a.startsWith('formalism='))
  || process.argv.find((a, i) => process.argv[i - 1] === '--formalism');
let formalism = 'ode';
if (formArg) {
  formalism = String(formArg).replace(/^--?formalism=/, '').trim() || 'ode';
} else {
  const idx = process.argv.indexOf('--formalism');
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    formalism = String(process.argv[idx + 1]).trim() || 'ode';
  }
}
formalism = formalism.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'ode';

const pascal = `build${name[0].toUpperCase()}${name.slice(1)}`;

const factoryPath = path.join(root, 'js/models/factory.js');
let factory = fs.readFileSync(factoryPath, 'utf8');
if (factory.includes(`${pascal}(`) || factory.includes(`${name}:`)) {
  console.error(`family "${name}" 似乎已存在`);
  process.exit(1);
}

factory = factory.replace(
  /(\s+)(aero: buildAero,)/,
  `$1${name}: ${pascal},\n$1$2`,
);

const stub = `
function ${pascal}(spec) {
  return {
    ...baseMeta(spec),
    params: { k: 1, speed: 1 },
    paramSchema: {
      k: schemaNum('系数 k', 'dynamics', '—', 0.01, 100),
      speed: schemaNum('动画速', 'dynamics', '—', 0.1, 4),
    },
    init(state) {
      state.t = 0;
      state.val = 0;
    },
    step(state, dt) {
      state.t += dt * P(state.params, 'speed', 1);
      state.val = Math.sin(state.t) * P(state.params, 'k', 1);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(box.l, box.t + box.h * 0.5);
      ctx.lineTo(box.r, box.t + box.h * 0.5 - state.val * 8);
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: formatNum(state.t, d) },
        { label: 'val', value: formatNum(state.val, d) },
      ];
    },
    getTrajectory(state) { return [{ t: state.t, val: state.val }]; },
  };
}
`;

if (!factory.includes(`function ${pascal}`)) {
  factory = factory.replace(/\nfunction buildAero\(spec\) \{/, `${stub}\nfunction buildAero(spec) {`);
  // if buildAero not found, append before last export-less end
  if (!factory.includes(`function ${pascal}`)) {
    factory += `\n${stub}\n`;
  }
}
fs.writeFileSync(factoryPath, factory);

const formPath = path.join(root, 'js/lab/formalism.js');
let form = fs.readFileSync(formPath, 'utf8');
if (!form.includes(`${name}:`)) {
  form = form.replace(
    /export const FAMILY_META = \{/,
    `export const FAMILY_META = {\n  ${name}: { formalism: '${formalism}', viz: 'gauge', hint: '${name} 原理级示意（脚手架）' },`,
  );
  fs.writeFileSync(formPath, form);
}

console.log(`已添加 family="${name}" → ${pascal}() · formalism=${formalism}`);
console.log('下一步:');
console.log(`  1. 编辑 js/models/factory.js 中的 ${pascal}`);
console.log('  2. 在 data/catalog.json 增加 "family": "' + name + '" 条目');
console.log('  3. npm test && 打开侧栏 form 筛选验证');
console.log('  见 docs/add-factory-family.md');
