#!/usr/bin/env node
/**
 * Write fingerprinted index.html, asset-stamp.json, and per-subject catalog
 * slices into the Pages artifact (or a directory passed as argv[2]).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertDomainCoverage, domainIndex, entryStamp, fingerprint, packDomainIndex, readCatalog, rewriteIndex, specsForDomain,
} from './static-boot.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, '_site'));
const catalog = readCatalog(root);
assertDomainCoverage(catalog);
const stamp = fingerprint(root);
const stamped = {
  js: entryStamp(stamp),
  css: stamp.css,
  microCss: stamp.microCss,
  main: stamp.js,
  domainIndex: stamp.domainIndex,
  domains: stamp.domains,
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'asset-stamp.json'), `${JSON.stringify(stamped)}\n`);
const indexPath = path.join(out, 'index.html');
const html = fs.readFileSync(fs.existsSync(indexPath) ? indexPath : path.join(root, 'index.html'), 'utf8');
fs.writeFileSync(indexPath, rewriteIndex(html, stamp));
const dir = path.join(out, 'data/domains');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(out, 'data/domain-index.json'), JSON.stringify(packDomainIndex(domainIndex(catalog))));
const domains = [...new Set(catalog.map((spec) => spec.domain || '其他'))];
for (const domain of domains) {
  fs.writeFileSync(path.join(dir, `${domain}.json`), JSON.stringify(specsForDomain(catalog, domain)));
}
const bundleSrc = path.join(root, 'js/bundle');
const bundleOut = path.join(out, 'js/bundle');
if (fs.existsSync(bundleSrc)) {
  fs.mkdirSync(bundleOut, { recursive: true });
  for (const name of fs.readdirSync(bundleSrc)) {
    fs.copyFileSync(path.join(bundleSrc, name), path.join(bundleOut, name));
  }
}
console.log('prepared site', stamped.js, stamped.css, 'domains', domains.length, 'index', stamped.domainIndex);
