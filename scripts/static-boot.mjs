/**
 * Content fingerprints and per-subject catalog slices.
 * Pages and the dev server both use this so the browser never needs the full catalog up front.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function readCatalog(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
}

export function domainIndex(catalog) {
  return catalog.map((spec) => ({
    id: spec.id,
    domain: spec.domain || '其他',
    sub: spec.sub || '',
    name: spec.name || spec.id,
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
  const indexBody = JSON.stringify(domainIndex(catalog));
  const domains = {};
  for (const domain of [...new Set(catalog.map((spec) => spec.domain || '其他'))]) {
    domains[domain] = sha12(JSON.stringify(specsForDomain(catalog, domain)));
  }
  return {
    js: hashFile('js/bundle/lab.js'),
    css: hashFile('css/styles.css'),
    microCss: hashFile('css/microscope-shell.css'),
    entry: hashFile('js/entry.js'),
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
  return next;
}

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
