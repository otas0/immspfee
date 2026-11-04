#!/usr/bin/env node
/**
 * 工厂中文 schema 覆盖率报表：paramSchema 中文 label / group / unit 齐全度。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { models, loadModelMetadata } = await import(
  pathToFileURL(path.join(root, 'js/models/index.js')).href
);
await loadModelMetadata(pathToFileURL(path.join(root, 'data/models.json')).href);

const ZH = /[\u4e00-\u9fff]/;
const GROUPS = new Set(['dynamics', 'initial', 'numerics', 'display', 'custom']);

let params = 0;
let withSchema = 0;
let zhLabel = 0;
let withUnit = 0;
let withGroup = 0;
let withBounds = 0;
const weakModels = [];

for (const m of models) {
  const keys = Object.keys(m.params || {});
  const schema = m.paramSchema || {};
  let missLabel = 0;
  let missZh = 0;
  for (const k of keys) {
    params += 1;
    const meta = schema[k];
    if (!meta) {
      missLabel += 1;
      continue;
    }
    withSchema += 1;
    if (meta.label) {
      if (ZH.test(String(meta.label)) || /[₁₂θλμ]/.test(String(meta.label))) zhLabel += 1;
      else missZh += 1;
    } else missLabel += 1;
    if (meta.unit != null && String(meta.unit).length) withUnit += 1;
    if (GROUPS.has(meta.group)) withGroup += 1;
    if (Number.isFinite(meta.min) && Number.isFinite(meta.max)) withBounds += 1;
  }
  if (missLabel + missZh > 0) {
    weakModels.push({
      id: m.id,
      name: m.name,
      params: keys.length,
      missingOrLatinLabel: missLabel + missZh,
    });
  }
}

weakModels.sort((a, b) => b.missingOrLatinLabel - a.missingOrLatinLabel);

const pct = (n) => (params ? ((100 * n) / params).toFixed(1) : '0.0');
const report = {
  generatedAt: new Date().toISOString(),
  models: models.length,
  params,
  coverage: {
    schema: { n: withSchema, pct: pct(withSchema) },
    zhOrSymbolLabel: { n: zhLabel, pct: pct(zhLabel) },
    unit: { n: withUnit, pct: pct(withUnit) },
    group: { n: withGroup, pct: pct(withGroup) },
    bounds: { n: withBounds, pct: pct(withBounds) },
  },
  weakTop: weakModels.slice(0, 40),
};

const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'schema-coverage.json'), `${JSON.stringify(report, null, 2)}\n`);

const md = [
  '# 工厂中文 schema 覆盖率',
  '',
  `- 模型数: **${report.models}**`,
  `- 参数槽: **${params}**`,
  `- schema 覆盖: **${report.coverage.schema.pct}%**`,
  `- 中文/符号 label: **${report.coverage.zhOrSymbolLabel.pct}%**`,
  `- unit: **${report.coverage.unit.pct}%**`,
  `- group: **${report.coverage.group.pct}%**`,
  `- min/max: **${report.coverage.bounds.pct}%**`,
  '',
  '## 待补强（节选）',
  '',
  '| id | name | params | 缺 label |',
  '|----|------|--------|----------|',
  ...report.weakTop.map((w) => `| ${w.id} | ${w.name} | ${w.params} | ${w.missingOrLatinLabel} |`),
  '',
];
fs.writeFileSync(path.join(outDir, 'schema-coverage.md'), `${md.join('\n')}\n`);

console.log(`schema coverage → artifacts/schema-coverage.md`);
console.log(`  schema ${report.coverage.schema.pct}% · zh-label ${report.coverage.zhOrSymbolLabel.pct}% · unit ${report.coverage.unit.pct}%`);
if (weakModels.length) {
  console.log(`  weak models: ${weakModels.length} (top ${Math.min(5, weakModels.length)}: ${weakModels.slice(0, 5).map((w) => w.id).join(', ')})`);
}
