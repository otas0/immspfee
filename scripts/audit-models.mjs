#!/usr/bin/env node
/**
 * 工厂族抽检：公式符号 vs 读数/参数标签；paramSchema < 4 → WARN。
 * 权威覆盖率写入 artifacts/authority-coverage.md（缺权威则失败）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { models } from '../js/models/index.js';
import { validateUserModelDraft } from '../js/lab/userModels.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const catalog = models.filter((m) => !String(m.id).startsWith('user-'));
const missingAuth = catalog.filter((m) => !m.authority || String(m.authority).length < 8 || !m.assumptions);
const thinSchema = [];
for (const m of catalog) {
  const n = Object.keys(m.paramSchema || {}).length;
  if (n < 4) thinSchema.push({ id: m.id, family: m.family || m.capabilities?.viz || '', n });
}

function latinTokens(s) {
  const set = new Set();
  for (const m of String(s || '').matchAll(/[A-Za-z][A-Za-z0-9]*/g)) {
    const w = m[0];
    if (w.length < 2) continue;
    if (/^(sin|cos|tan|exp|log|the|and|for|true|false)$/i.test(w)) continue;
    set.add(w.toLowerCase());
  }
  return set;
}

const byFamily = new Map();
for (const m of catalog) {
  const fam = m.family || 'hand';
  if (!byFamily.has(fam)) byFamily.set(fam, m);
}
const symbolRows = [];
for (const [fam, m] of byFamily) {
  const formulaTok = latinTokens(m.formula);
  if (!formulaTok.size) continue;
  let labels = '';
  try {
    const state = { params: { ...(m.params || {}) } };
    m.init?.(state);
    m.step?.(state, 0.01);
    const reads = m.getReadouts?.(state) || [];
    labels = reads.map((r) => r.label).join(' ');
  } catch (err) {
    symbolRows.push({ family: fam, id: m.id, ok: false, detail: String(err.message || err) });
    continue;
  }
  const schemaLabels = Object.values(m.paramSchema || {}).map((s) => `${s.label || ''} ${s.unit || ''}`).join(' ');
  const hay = latinTokens(`${labels} ${schemaLabels} ${m.formula}`);
  const missing = [...formulaTok].filter((t) => !hay.has(t) && !labels.toLowerCase().includes(t));
  // 中文标签合法：仅当公式有英文词且参数/读数完全看不到该词时记 WARN
  const unseen = [...formulaTok].filter((t) => !`${labels} ${schemaLabels}`.toLowerCase().includes(t));
  symbolRows.push({
    family: fam,
    id: m.id,
    ok: unseen.length === 0,
    unseen,
  });
}
const symbolWarn = symbolRows.filter((r) => !r.ok);

const draftOk = validateUserModelDraft({
  name: '审计用草稿',
  domain: '物理',
  sub: '经典力学',
  family: 'ode1d',
  formula: 'mẍ = −kx',
  authority: 'Thornton & Marion, Classical Dynamics, §3.4',
  assumptions: '线性弹簧、常质量、一维；忽略干摩擦',
  description: '状态 (x,v)；与标准谐振子方程一致',
  fidelity: 'engineering',
  ethicsOk: true,
});
const draftBad = validateUserModelDraft({ name: 'x', ethicsOk: false });

const lines = [
  '# Authority coverage',
  '',
  `- models: ${catalog.length}`,
  `- with authority+assumptions: ${catalog.length - missingAuth.length}`,
  `- missing: ${missingAuth.map((m) => m.id).join(', ') || '—'}`,
  `- deprecated: ${catalog.filter((m) => m.deprecated).length}`,
  `- engineering: ${catalog.filter((m) => m.fidelity === 'engineering').length}`,
  `- principle: ${catalog.filter((m) => m.fidelity !== 'engineering').length}`,
  `- paramSchema < 4: ${thinSchema.length}`,
  `- symbol spot-check families: ${symbolRows.length}, warn: ${symbolWarn.length}`,
  `- validateUserModelDraft accept: ${draftOk.ok}`,
  `- validateUserModelDraft reject: ${!draftBad.ok}`,
  '',
  '## paramSchema < 4',
  '',
  ...thinSchema.slice(0, 80).map((r) => `- ${r.id} (${r.n})`),
  thinSchema.length > 80 ? `- … ${thinSchema.length - 80} more` : '',
  '',
  '## symbol vs readout (one model / family)',
  '',
  ...symbolWarn.slice(0, 40).map((r) => `- ${r.family}/${r.id}: ${r.detail || (r.unseen || []).join(', ')}`),
  '',
];
fs.writeFileSync(path.join(outDir, 'authority-coverage.md'), `${lines.filter((l) => l !== undefined).join('\n')}\n`);
const payload = {
  generatedAt: new Date().toISOString(),
  n: catalog.length,
  missingAuthority: missingAuth.map((m) => m.id),
  thinSchema: thinSchema.length,
  symbolWarn: symbolWarn.length,
  draftOk: draftOk.ok,
  draftBadRejected: !draftBad.ok,
};
fs.writeFileSync(path.join(outDir, 'authority-coverage.json'), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`authority ${catalog.length - missingAuth.length}/${catalog.length}`);
console.log(`WARN  paramSchema<4: ${thinSchema.length}`);
console.log(`WARN  symbol/readout families: ${symbolWarn.length}/${symbolRows.length}`);
console.log(`validateUserModelDraft ok=${draftOk.ok} reject=${!draftBad.ok}`);
if (missingAuth.length || !draftOk.ok || draftBad.ok) {
  console.error('authority gate failed');
  process.exit(1);
}
