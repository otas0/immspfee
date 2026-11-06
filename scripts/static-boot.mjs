/**
 * Content fingerprints and per-subject catalog slices.
 * Pages and the dev server both use this so the browser never needs the full catalog up front.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { STRINGS } from '../js/i18n/strings.js';
import { expandDomainIndex, packDomainIndex } from '../js/boot/domainPack.js';

export function readCatalog(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
}

export function domainIndex(catalog) {
  return catalog.map((spec) => ({
    id: spec.id,
    domain: spec.domain || '其他',
    sub: spec.sub || '',
    name: spec.name || spec.id,
    family: spec.family || '',
  }));
}

export function specsForDomain(catalog, domain) {
  return catalog.filter((spec) => (spec.domain || '其他') === domain);
}

function sha12(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
}

export function fingerprint(root) {
  const hashFile = (rel) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) return 'missing';
    return sha12(fs.readFileSync(file));
  };
  const catalog = readCatalog(root);
  const indexBody = JSON.stringify(packDomainIndex(domainIndex(catalog)));
  const domains = {};
  for (const domain of [...new Set(catalog.map((spec) => spec.domain || '其他'))]) {
    domains[domain] = sha12(JSON.stringify(specsForDomain(catalog, domain)));
  }
  return {
    js: hashFile('js/bundle/lab.js'),
    css: hashFile('css/styles.css'),
    microCss: hashFile('css/microscope-shell.css'),
    entry: hashFile('js/entry.js'),
    bundleMeta: hashFile('js/bundle/meta.json'),
    domainIndex: sha12(indexBody),
    domains,
  };
}

/** Bust the entry module when either the loader or lab bundle changes. */
export function entryStamp(stamp) {
  return crypto.createHash('sha256').update(`${stamp.entry}:${stamp.js}`).digest('hex').slice(0, 12);
}

export function rewriteIndex(html, stamp) {
  const v = entryStamp(stamp);
  let next = html;
  if (!next.includes('name="imm-js"')) {
    next = next.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n  <meta name="imm-js" content="${v}" />\n  <meta name="imm-css" content="${stamp.css}" />`,
    );
  } else {
    next = next.replace(/name="imm-js" content="[^"]*"/, `name="imm-js" content="${v}"`);
    next = next.replace(/name="imm-css" content="[^"]*"/, `name="imm-css" content="${stamp.css}"`);
  }
  next = next.replace(
    /href="\.\/css\/styles\.css(?:\?v=[^"]*)?"/,
    `href="./css/styles.css?v=${stamp.css}"`,
  );
  next = next.replace(
    /href="\.\/css\/microscope-shell\.css(?:\?v=[^"]*)?"/,
    `href="./css/microscope-shell.css?v=${stamp.microCss || stamp.css}"`,
  );
  const bootScript = bootI18nScript();
  if (next.includes('window.__BOOT_I18N=')) {
    next = next.replace(/<script>window\.__BOOT_I18N=.*?<\/script>/, bootScript);
  } else {
    next = next.replace('</head>', `  ${bootScript}\n</head>`);
  }
  return next;
}

const BOOT_KEYS = ['ui.bootReload', 'ui.bootManual', 'ui.bootDismiss'];

export function bootI18nScript() {
  const pack = {};
  for (const [lang, table] of Object.entries(STRINGS)) {
    pack[lang] = {};
    for (const key of BOOT_KEYS) pack[lang][key] = table[key] || '';
  }
  return `<script>window.__BOOT_I18N=${JSON.stringify(pack)};</script>`;
}

/** CSS and the lab bundle use different stamps, so one file changing does not refetch the other. */
export function assertStampIndependence(stamp) {
  const base = entryStamp(stamp);
  if (entryStamp({ ...stamp, css: `${stamp.css}ff` }) !== base) {
    throw new Error('css fingerprint changed the js entry stamp');
  }
  if (entryStamp({ ...stamp, microCss: `${stamp.microCss || ''}ff` }) !== base) {
    throw new Error('microscope css fingerprint changed the js entry stamp');
  }
  if (entryStamp({ ...stamp, js: `${stamp.js}ff` }) === base) {
    throw new Error('lab bundle fingerprint did not change the js entry stamp');
  }
  const html = rewriteIndex(
    '<html><head><meta charset="UTF-8" /></head><body><link rel="stylesheet" href="./css/styles.css" /></body></html>',
    stamp,
  );
  if (!html.includes(`styles.css?v=${stamp.css}`)) throw new Error('css href is not the css stamp');
  if (!html.includes(`name="imm-js" content="${base}"`)) throw new Error('imm-js is not the entry stamp');
  if (stamp.css !== base && html.includes(`styles.css?v=${base}`)) {
    throw new Error('css href reused the js stamp');
  }
}

/** First-screen index budget (no formula strings — those live in domain chunks). */
export function assertIndexBudget(catalog) {
  const packed = packDomainIndex(domainIndex(catalog));
  const bytes = Buffer.byteLength(JSON.stringify(packed));
  // After dropping formula strings: ~134KB. Keep headroom under the old 256KB ceiling.
  const limit = 160 * 1024;
  if (bytes > limit) throw new Error(`domain index ${bytes} bytes exceeds ${limit}`);
  if (JSON.stringify(packed).includes('"formula"')) {
    throw new Error('packed domain index must not carry formula strings');
  }
  const expanded = expandDomainIndex(packed);
  if (expanded.length !== catalog.length) {
    throw new Error(`packed domain index expanded to ${expanded.length}`);
  }
  return bytes;
}

/** Pages must ship meta.json so hashed chunk names stay discoverable / stamped. */
export function assertBundleMeta(stamp, root) {
  const metaPath = path.join(root, 'js/bundle/meta.json');
  if (!fs.existsSync(metaPath)) throw new Error('js/bundle/meta.json missing');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!Array.isArray(meta.outputs) || !meta.outputs.some((row) => row.file === 'lab.js')) {
    throw new Error('bundle meta.json missing lab.js output');
  }
  if (!stamp?.bundleMeta || stamp.bundleMeta === 'missing') {
    throw new Error('asset-stamp missing bundleMeta hash');
  }
  const live = sha12(fs.readFileSync(metaPath));
  if (stamp.bundleMeta !== live) {
    throw new Error(`bundleMeta stamp ${stamp.bundleMeta} != meta.json ${live}`);
  }
  for (const row of meta.outputs) {
    if (!row.file?.endsWith('.js')) continue;
    if (!fs.existsSync(path.join(root, 'js/bundle', row.file))) {
      throw new Error(`meta.json lists ${row.file} but file is missing`);
    }
  }
  return stamp.bundleMeta;
}

export { packDomainIndex };

export function assertDomainCoverage(catalog) {
  const index = domainIndex(catalog);
  if (index.length !== catalog.length) {
    throw new Error(`domain index ${index.length} != catalog ${catalog.length}`);
  }
  const seen = new Set();
  for (const row of index) {
    if (seen.has(row.id)) throw new Error(`duplicate domain index id ${row.id}`);
    seen.add(row.id);
    const chunk = specsForDomain(catalog, row.domain);
    if (!chunk.some((spec) => spec.id === row.id)) {
      throw new Error(`${row.id} missing from ${row.domain}`);
    }
  }
}
