#!/usr/bin/env node
/**
 * 模型族 → 目录生成器
 *
 *   npm run gen:families              # 每族写入 1 条（唯一仿真引擎）
 *   npm run gen:families -- --dry-run
 *
 * 合并进 data/catalog.json + data/models.json（跳过已有 id）；
 * 批量为新 id 写入 data/palettes.json；同步写出 data/families.json。
 *
 * 轴组合 × 参数采样属于 paramBench 预设空间，不再展开为侧栏克隆条目。
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

function parseArgs(argv) {
  const args = {
    dryRun: false,
    writeFamiliesJson: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-families-json') args.writeFamiliesJson = false;
    // 兼容旧旗标：忽略，不再做笛卡尔爆炸
    else if (a === '--full' || a === '--target' || a === '--max-per-family') {
      if (a === '--target' || a === '--max-per-family') i += 1;
    }
  }
  return args;
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function domainHue(domain) {
  const base = {
    物理: 200,
    计算机科学: 145,
    计算机工程: 265,
    工程: 25,
  }[domain];
  if (base != null) return base;
  return hash32(domain) % 360;
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c);
  };
  const r = f(0); const g = f(8); const b = f(4);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function synthPalette(id, domain) {
  const hue = (domainHue(domain) + (hash32(id) % 40) - 20 + 360) % 360;
  const swatch = hslToHex(hue, 0.72, 0.55);
  return {
    swatch,
    body: swatch,
    body2: hslToHex((hue + 40) % 360, 0.65, 0.45),
    accent: hslToHex((hue + 180) % 360, 0.7, 0.55),
    vector: hslToHex((hue + 120) % 360, 0.55, 0.6),
    trail: `hsla(${hue}, 70%, 55%, 0.4)`,
    legend: ['主体 body', '强调 accent', '矢量 vector'],
  };
}

/** 规范默认：每维取 samples[0]（定义序中的典型值，如 g=9.81） */
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

/**
 * 每族仅 1 条 catalog 条目：同一 factory/variant 引擎，轴与采样不进侧栏。
 * 稳定 id = fam-{slug}-v01（深链兼容）。
 */
function buildEntryForFamily(fam, section) {
  const { params, schemaHints } = canonicalDimValues(fam.dims || []);
  const dimText = (fam.dims || []).map((d) => d.label || d.key).join('、');
  return {
    domain: section.domain,
    sub: section.sub,
    id: `fam-${fam.slug}-v01`,
    name: fam.name,
    formula: fam.formula || fam.name,
    description: `${section.domain}/${section.sub}：${fam.name}；维度 ${dimText || '—'}；参数见工作台`,
    family: fam.factory || 'variant',
    generated: true,
    variantOf: fam.slug,
    axes: ['默认'],
    dims: schemaHints,
    defaults: params,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  const palettes = JSON.parse(fs.readFileSync(palettesPath, 'utf8'));
  if (!palettes.models) palettes.models = {};

  const existingIds = new Set(catalog.map((m) => m.id));
  const generated = [];
  const perDomain = {};
  const perFamily = {};

  for (const section of SECTIONS) {
    for (const fam of section.families) {
      const entry = buildEntryForFamily(fam, section);
      if (existingIds.has(entry.id)) continue;
      generated.push(entry);
      existingIds.add(entry.id);
      perDomain[entry.domain] = (perDomain[entry.domain] || 0) + 1;
      perFamily[`${section.domain}/${fam.slug}`] = 1;
    }
  }

  console.log(`existing=${catalog.length}`);
  console.log(`generated=${generated.length} (1 per missing family)`);
  console.log('per-domain new:', perDomain);

  if (args.writeFamiliesJson && !args.dryRun) {
    fs.writeFileSync(familiesOut, `${JSON.stringify(toFamiliesJson(), null, 2)}\n`);
    console.log(`wrote ${path.relative(root, familiesOut)}`);
  }

  if (args.dryRun) {
    console.log('dry-run: no catalog/models/palettes write');
    const preview = generated.slice(0, 5);
    console.log('preview', JSON.stringify(preview, null, 2));
    return;
  }

  const newCatalog = [...catalog, ...generated];
  const modelEntries = generated.map((m) => ({
    domain: m.domain,
    sub: m.sub,
    id: m.id,
    name: m.name,
    formula: m.formula,
    description: m.description,
    family: m.family,
    generated: true,
    variantOf: m.variantOf,
    axes: m.axes,
    dims: m.dims,
    defaults: m.defaults,
  }));
  const newModels = [...models, ...modelEntries];

  for (const m of generated) {
    if (!palettes.models[m.id]) {
      palettes.models[m.id] = synthPalette(m.id, m.domain);
    }
  }

  fs.writeFileSync(catalogPath, `${JSON.stringify(newCatalog, null, 2)}\n`);
  fs.writeFileSync(modelsPath, `${JSON.stringify(newModels, null, 2)}\n`);
  fs.writeFileSync(palettesPath, `${JSON.stringify(palettes, null, 2)}\n`);

  const finalByDomain = {};
  for (const m of newCatalog) {
    finalByDomain[m.domain] = (finalByDomain[m.domain] || 0) + 1;
  }
  console.log(`catalog now ${newCatalog.length}`);
  console.log('domain counts:', finalByDomain);
  console.log(`families touched: ${Object.keys(perFamily).length}`);
}

main();
