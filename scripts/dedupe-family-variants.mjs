#!/usr/bin/env node
/**
 * 折叠 catalog / models 中族×变体笛卡尔爆炸：
 * 同一 variantOf（同一仿真引擎）只保留 1 条。
 *
 * 规则：
 * - 手写模型（generated≠true）一律保留
 * - 生成条目按 variantOf 分组；优先保留 fam-{slug}-v01，否则取最小 vNN
 * - 保留条目规范为清洁中文名 + 维 samples[0] 默认值（轴记为「默认」）
 * - 阻力/平斜抛/常可变 g 等仅为 dims/axes 参数，不另开条目
 *
 *   node scripts/dedupe-family-variants.mjs
 *   node scripts/dedupe-family-variants.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, toFamiliesJson } from './family-defs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data/catalog.json');
const modelsPath = path.join(root, 'data/models.json');
const palettesPath = path.join(root, 'data/palettes.json');
const familiesOut = path.join(root, 'data/families.json');

const dryRun = process.argv.includes('--dry-run');

function familyMetaBySlug() {
  const map = new Map();
  for (const section of SECTIONS) {
    for (const fam of section.families) {
      map.set(fam.slug, { fam, section });
    }
  }
  return map;
}

function canonicalDimValues(dims) {
  const params = {};
  const schemaHints = [];
  for (const d of dims || []) {
    const samples = d.samples?.length
      ? d.samples
      : [d.min ?? 0, ((d.min ?? 0) + (d.max ?? 1)) / 2, d.max ?? 1];
    const val = samples[0];
    params[d.key] = val;
    schemaHints.push({
      key: d.key,
      label: d.label || d.key,
      unit: d.unit || '—',
      min: d.min ?? Math.min(...samples),
      max: d.max ?? Math.max(...samples),
      value: val,
    });
  }
  return { params, schemaHints };
}

function variantRank(id) {
  const m = /^fam-.+-v(\d+)$/.exec(id);
  return m ? Number(m[1]) : 9999;
}

function normalizeKept(entry, meta) {
  if (!meta) {
    // 无 defs 时仍折叠命名：去掉参数尾巴，保留族名首段
    const baseName = String(entry.name || '').split(' · ')[0] || entry.name;
    return {
      ...entry,
      name: baseName,
      axes: ['默认'],
      description: entry.description?.replace(/（[^）]*）/, '') || entry.description,
    };
  }
  const { fam, section } = meta;
  const { params, schemaHints } = canonicalDimValues(fam.dims || []);
  const dimText = (fam.dims || []).map((d) => d.label || d.key).join('、');
  return {
    ...entry,
    id: `fam-${fam.slug}-v01`,
    name: fam.name,
    formula: fam.formula || fam.name,
    description: `${section.domain}/${section.sub}：${fam.name}；维度 ${dimText || '—'}；参数见工作台`,
    family: fam.factory || entry.family,
    generated: true,
    variantOf: fam.slug,
    axes: ['默认'],
    dims: schemaHints,
    defaults: params,
    domain: section.domain,
    sub: section.sub,
  };
}

function slimModel(m) {
  return {
    domain: m.domain,
    sub: m.sub,
    id: m.id,
    name: m.name,
    formula: m.formula,
    description: m.description,
    family: m.family,
    ...(m.generated
      ? {
          generated: true,
          variantOf: m.variantOf,
          axes: m.axes,
          dims: m.dims,
          defaults: m.defaults,
        }
      : {}),
  };
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  const palettes = JSON.parse(fs.readFileSync(palettesPath, 'utf8'));
  const meta = familyMetaBySlug();

  const before = catalog.length;
  const hand = [];
  const byVariant = new Map();

  for (const m of catalog) {
    if (!m.generated) {
      hand.push(m);
      continue;
    }
    const key = m.variantOf || m.id;
    if (!byVariant.has(key)) byVariant.set(key, []);
    byVariant.get(key).push(m);
  }

  const keptGen = [];
  const dropped = [];
  const examples = { projectile: { kept: null, dropped: [] } };

  for (const [slug, list] of byVariant) {
    list.sort((a, b) => variantRank(a.id) - variantRank(b.id)
      || a.id.localeCompare(b.id));
    const preferId = `fam-${slug}-v01`;
    const winner = list.find((m) => m.id === preferId) || list[0];
    const normalized = normalizeKept(winner, meta.get(slug));
    // 若规范化改了 id（非 v01 胜出），确保不与已有手写 id 冲突
    if (hand.some((h) => h.id === normalized.id) || keptGen.some((k) => k.id === normalized.id)) {
      normalized.id = winner.id;
    }
    keptGen.push(normalized);
    for (const m of list) {
      if (m.id === winner.id) continue;
      dropped.push(m);
      if (slug === 'projectile') examples.projectile.dropped.push(m.name);
    }
    if (slug === 'projectile') {
      examples.projectile.kept = { id: normalized.id, name: normalized.name, defaults: normalized.defaults };
    }
  }

  // 保持原相对顺序：手写在前（按原序），生成条目按首次出现的 variantOf 序
  const firstIdx = new Map();
  catalog.forEach((m, i) => {
    if (m.generated) {
      const key = m.variantOf || m.id;
      if (!firstIdx.has(key)) firstIdx.set(key, i);
    }
  });
  keptGen.sort((a, b) => (firstIdx.get(a.variantOf) ?? 0) - (firstIdx.get(b.variantOf) ?? 0));

  const handOrder = new Map(hand.map((m) => [m.id, catalog.findIndex((c) => c.id === m.id)]));
  hand.sort((a, b) => handOrder.get(a.id) - handOrder.get(b.id));

  // 交错：按原 catalog 位置合并（手写位置不动，生成族出现在其 v01 原位）
  const newCatalog = [];
  const placedVariants = new Set();
  const handById = new Map(hand.map((m) => [m.id, m]));
  const genByVariant = new Map(keptGen.map((m) => [m.variantOf, m]));

  for (const m of catalog) {
    if (!m.generated) {
      newCatalog.push(handById.get(m.id));
      continue;
    }
    const key = m.variantOf || m.id;
    if (placedVariants.has(key)) continue;
    placedVariants.add(key);
    newCatalog.push(genByVariant.get(key));
  }

  const dropIds = new Set(dropped.map((m) => m.id));
  // 胜出者若从 v0N 规范成 v01，旧 id 也可能需从 palette 清理
  const keepIds = new Set(newCatalog.map((m) => m.id));
  for (const m of catalog) {
    if (m.generated && !keepIds.has(m.id)) dropIds.add(m.id);
  }

  const newModels = newCatalog.map(slimModel);

  if (palettes.models) {
    for (const id of dropIds) delete palettes.models[id];
  }

  console.log(JSON.stringify({
    before,
    after: newCatalog.length,
    removed: before - newCatalog.length,
    handcrafted: hand.length,
    generatedFamilies: keptGen.length,
    projectile: examples.projectile,
  }, null, 2));

  if (dryRun) {
    console.log('dry-run: no writes');
    return;
  }

  fs.writeFileSync(catalogPath, `${JSON.stringify(newCatalog, null, 2)}\n`);
  fs.writeFileSync(modelsPath, `${JSON.stringify(newModels, null, 2)}\n`);
  fs.writeFileSync(palettesPath, `${JSON.stringify(palettes, null, 2)}\n`);
  fs.writeFileSync(familiesOut, `${JSON.stringify(toFamiliesJson(), null, 2)}\n`);
  console.log('wrote catalog, models, palettes, families.json');
}

main();
