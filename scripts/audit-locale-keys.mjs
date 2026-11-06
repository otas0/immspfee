#!/usr/bin/env node
/**
 * Audit js/i18n/strings.js keys against:
 *  - data-i18n / data-i18n-* attributes in HTML / JS
 *  - static t('key') / t("key") calls
 *  - dynamic template prefixes (t(`prefix.${expr}`)) — prefix counts as used
 *  - BOOT_KEYS / known injected packs
 *
 * Does not delete keys. Prints unused candidates for lab.gz review.
 * Exit 0 always unless --strict and unused remain after allowlist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../js/i18n/strings.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

const zh = STRINGS.zh || {};
const allKeys = Object.keys(zh);

/** Keys injected outside normal t() / data-i18n (see scripts/static-boot.mjs). */
const BOOT_KEYS = new Set(['ui.bootReload', 'ui.bootManual', 'ui.bootDismiss']);

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '_site' || name === 'js/bundle') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else if (/\.(js|mjs|html|css)$/i.test(name)) acc.push(p);
  }
  return acc;
}

const files = [
  ...walkFiles(path.join(root, 'js')),
  ...walkFiles(path.join(root, 'scripts')),
  path.join(root, 'index.html'),
  path.join(root, 'manual.html'),
].filter((p) => fs.existsSync(p) && !p.includes(`${path.sep}bundle${path.sep}`));

const usedExact = new Set(BOOT_KEYS);
const usedPrefixes = new Set();

const dataI18nRe = /data-i18n(?:-[\w-]+)?=["']([a-zA-Z0-9_.]+)["']/g;
const staticTRe = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
const lookupRe = /\blookup\(\s*[^,]+,\s*['"]([a-zA-Z0-9_.]+)['"]/g;
const keyLiteralRe = /(?:key|KEY)\s*=\s*['"]([a-zA-Z0-9_.]+)['"]/g;
const dynTRe = /\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g;
const dynBracketRe = /\bt\(\s*[`'"]([a-zA-Z0-9_.]+)\.\$\{/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const re of [dataI18nRe, staticTRe, lookupRe, keyLiteralRe]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) usedExact.add(m[1]);
  }
  for (const re of [dynTRe, dynBracketRe]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) usedPrefixes.add(m[1]);
  }
  // domain.${x} style and fidelity labels often built from catalog
  if (/domain\.|fidelity\.|err[A-Z]/.test(text) && file.includes('userModel')) {
    usedPrefixes.add('domain');
    usedPrefixes.add('dialog');
  }
  // ternary fidelity key selection in previewText.js
  const fidelityKeys = text.matchAll(/['"](ui\.fidelity(?:Engineering|Principle))['"]/g);
  for (const m of fidelityKeys) usedExact.add(m[1]);
}

function isUsed(key) {
  if (usedExact.has(key)) return true;
  for (const pref of usedPrefixes) {
    if (key === pref || key.startsWith(`${pref}.`)) return true;
  }
  return false;
}

const unused = allKeys.filter((k) => !isUsed(k)).sort();
const byPrefix = {};
for (const k of unused) {
  const pref = k.split('.')[0];
  byPrefix[pref] = (byPrefix[pref] || 0) + 1;
}

const report = {
  at: new Date().toISOString(),
  locales: Object.keys(STRINGS),
  keyCountZh: allKeys.length,
  usedExact: usedExact.size,
  usedPrefixes: [...usedPrefixes].sort(),
  unusedCount: unused.length,
  unusedByPrefix: byPrefix,
  unused,
  note: 'Candidates only — dynamic keys / late-bound packs may false-positive. Confirm with rg before deleting. Prefer small drops (orphan caveat.*) over mass dialog.* removal.',
};

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/locale-key-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  keyCountZh: report.keyCountZh,
  unusedCount: report.unusedCount,
  unusedByPrefix: report.unusedByPrefix,
  usedPrefixes: report.usedPrefixes,
  sampleUnused: unused.slice(0, 40),
}, null, 2));

if (strict && unused.length) {
  console.error(`audit-locale-keys --strict: ${unused.length} unused candidates`);
  process.exit(1);
}
