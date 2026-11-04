#!/usr/bin/env node
/**
 * 模型族 → 变体目录生成器
 *
 *   npm run gen:families              # 默认可达 ≥3000 总量（cap 防爆炸）
 *   npm run gen:families -- --full    # 逼近领域目标合计 ~5000（四主域）
 *   npm run gen:families -- --target 4000 --max-per-family 20
 *   npm run gen:families -- --dry-run
 *
 * 合并进 data/catalog.json + data/models.json（跳过已有 id）；
 * 批量为新 id 写入 data/palettes.json；同步写出 data/families.json。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, DOMAIN_TARGETS, toFamiliesJson } from './family-defs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data/catalog.json');
const modelsPath = path.join(root, 'data/models.json');
const palettesPath = path.join(root, 'data/palettes.json');
const familiesOut = path.join(root, 'data/families.json');

function parseArgs(argv) {
  const args = {
    full: false,
    dryRun: false,
    target: null,
    maxPerFamily: null,
    writeFamiliesJson: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--full') args.full = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--target') args.target = Number(argv[++i]);
    else if (a === '--max-per-family') args.maxPerFamily = Number(argv[++i]);
    else if (a === '--no-families-json') args.writeFamiliesJson = false;
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

function cartesian(axes) {
  if (!axes.length) return [[]];
  return axes.reduce(
    (acc, axis) => acc.flatMap((prefix) => axis.map((v) => [...prefix, v])),
    [[]],
  );
}

/** 确定性抽样：步长遍历，保证稳定顺序 */
function sampleList(list, n, seedStr) {
  if (list.length <= n) return list;
  const out = [];
  const step = list.length / n;
  const offset = hash32(seedStr) % list.length;
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(offset + i * step) % list.length;
    out.push(list[idx]);
  }
  // 去重保序
  const seen = new Set();
  const uniq = [];
  for (const x of out) {
    const key = Array.isArray(x) ? x.join('|') : String(x);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(x);
  }
  // 若去重后不足，按顺序补齐
  for (let i = 0; i < list.length && uniq.length < n; i += 1) {
    const key = Array.isArray(list[i]) ? list[i].join('|') : String(list[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(list[i]);
  }
  return uniq;
}

function pickDimValues(dims, variantIndex, seed) {
  const params = {};
  const schemaHints = [];
  dims.forEach((d, di) => {
    const samples = d.samples?.length
      ? d.samples
      : [d.min ?? 0, ((d.min ?? 0) + (d.max ?? 1)) / 2, d.max ?? 1];
    const idx = (variantIndex + di + (hash32(`${seed}:${d.key}`) % samples.length)) % samples.length;
    const val = samples[idx];
    params[d.key] = val;
    schemaHints.push({
      key: d.key,
      label: d.label || d.key,
      unit: d.unit || '—',
      min: d.min ?? Math.min(...samples),
      max: d.max ?? Math.max(...samples),
      value: val,
    });
  });
  return { params, schemaHints };
}

function buildVariantsForFamily(fam, section, maxPerFamily) {
  const combos = cartesian(fam.axes || [['默认']]);
  // 轴笛卡尔可能很小：循环轴组合 × 维度采样，确定性填满 maxPerFamily
  const n = Math.max(1, maxPerFamily);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const combo = combos[i % combos.length];
    const nn = String(i + 1).padStart(2, '0');
    const id = `fam-${fam.slug}-v${nn}`;
    const { params, schemaHints } = pickDimValues(fam.dims || [], i, fam.slug);
    const axisText = combo.join(' · ');
    const dimBits = schemaHints
      .slice(0, 2)
      .map((d) => `${d.label}=${d.value}`)
      .join(' ');
    const nameRaw = dimBits
      ? `${fam.name} · ${axisText} · ${dimBits}`
      : `${fam.name} · ${axisText}`;
    const name = nameRaw.length > 52 ? `${fam.name} · ${axisText} · v${nn}` : nameRaw;
    const dimText = (fam.dims || []).map((d) => d.label || d.key).join('、');
    out.push({
      domain: section.domain,
      sub: section.sub,
      id,
      name: name.length > 56 ? `${fam.name} · v${nn}` : name,
      formula: fam.formula || fam.name,
      description: `${section.domain}/${section.sub}：${fam.name}（${axisText}）；维度 ${dimText || '—'}；参数见工作台`,
      family: fam.factory || 'variant',
      generated: true,
      variantOf: fam.slug,
      axes: combo,
      dims: schemaHints,
      defaults: params,
    });
  }
  return out;
}

function allocateBudgets(existingByDomain, args) {
  const budgets = {};
  if (args.full) {
    for (const [d, t] of Object.entries(DOMAIN_TARGETS)) {
      budgets[d] = Math.max(0, t - (existingByDomain[d] || 0));
    }
    return budgets;
  }
  // 默认：按缺口比例填到 target 总量
  const existingTotal = Object.values(existingByDomain).reduce((a, b) => a + b, 0);
  const targetTotal = args.target ?? 3200;
  let need = Math.max(0, targetTotal - existingTotal);
  const gaps = {};
  let gapSum = 0;
  for (const [d, t] of Object.entries(DOMAIN_TARGETS)) {
    const g = Math.max(0, t - (existingByDomain[d] || 0));
    gaps[d] = g;
    gapSum += g;
  }
  if (gapSum === 0 || need === 0) {
    for (const d of Object.keys(DOMAIN_TARGETS)) budgets[d] = 0;
    return budgets;
  }
  // 若缺口小于 need，用满缺口；否则按比例切 need
  const scale = Math.min(1, need / gapSum);
  let assigned = 0;
  const domains = Object.keys(DOMAIN_TARGETS);
  domains.forEach((d, i) => {
    if (i === domains.length - 1) {
      budgets[d] = Math.max(0, Math.round(need * scale) - assigned);
      // 修正：按比例
      budgets[d] = Math.max(0, Math.min(gaps[d], need - assigned));
    } else {
      const n = Math.floor(gaps[d] * scale);
      budgets[d] = n;
      assigned += n;
    }
  });
  // 重新精确分配
  const exact = {};
  let left = need;
  const ordered = Object.entries(gaps).sort((a, b) => b[1] - a[1]);
  const weights = ordered.map(([, g]) => g);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  ordered.forEach(([d, g], i) => {
    if (i === ordered.length - 1) exact[d] = Math.min(g, left);
    else {
      const n = Math.min(g, Math.floor((need * g) / wsum));
      exact[d] = n;
      left -= n;
    }
  });
  return exact;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const maxPerFamily = args.maxPerFamily
    ?? (args.full ? 28 : 14);

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  const palettes = JSON.parse(fs.readFileSync(palettesPath, 'utf8'));
  if (!palettes.models) palettes.models = {};

  const existingIds = new Set(catalog.map((m) => m.id));
  const existingByDomain = {};
  for (const m of catalog) {
    existingByDomain[m.domain] = (existingByDomain[m.domain] || 0) + 1;
  }

  const budgets = allocateBudgets(existingByDomain, args);
  const remaining = { ...budgets };

  const generated = [];
  const perDomain = {};
  const perFamily = {};

  for (const section of SECTIONS) {
    const domain = section.domain;
    if ((remaining[domain] || 0) <= 0) continue;
    for (const fam of section.families) {
      if ((remaining[domain] || 0) <= 0) break;
      const room = Math.min(maxPerFamily, remaining[domain]);
      const variants = buildVariantsForFamily(fam, section, room);
      let added = 0;
      for (const v of variants) {
        if (existingIds.has(v.id)) continue;
        if ((remaining[domain] || 0) <= 0) break;
        generated.push(v);
        existingIds.add(v.id);
        remaining[domain] -= 1;
        added += 1;
        perDomain[domain] = (perDomain[domain] || 0) + 1;
      }
      if (added) perFamily[`${domain}/${fam.slug}`] = added;
    }
  }

  // 若仍未达 target（默认模式），用更高 per-family 回填尚未满的族
  if (!args.full) {
    const existingTotal = catalog.length;
    const targetTotal = args.target ?? 3200;
    let stillNeed = Math.max(0, targetTotal - existingTotal - generated.length);
    if (stillNeed > 0) {
      for (const section of SECTIONS) {
        if (stillNeed <= 0) break;
        for (const fam of section.families) {
          if (stillNeed <= 0) break;
          const extraCap = Math.min(8, stillNeed);
          const variants = buildVariantsForFamily(fam, section, maxPerFamily + extraCap);
          for (const v of variants) {
            if (existingIds.has(v.id)) continue;
            generated.push(v);
            existingIds.add(v.id);
            stillNeed -= 1;
            perDomain[v.domain] = (perDomain[v.domain] || 0) + 1;
            if (stillNeed <= 0) break;
          }
        }
      }
    }
  }

  console.log(`existing=${catalog.length}`);
  console.log(`generated=${generated.length}`);
  console.log('per-domain new:', perDomain);
  console.log('budgets:', budgets);
  console.log(`maxPerFamily=${maxPerFamily} full=${args.full}`);

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
  // models.json 与 catalog 同步精简字段（与现网一致）
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
