#!/usr/bin/env node
/**
 * Copy the running model's authority, assumptions, and fidelity into
 * catalog.json and models.json. The catalog formula stays the topic
 * key ("学科 · 主题"); the equation text lives on the model.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { models } = await import(pathToFileURL(path.join(root, 'js/models/index.js')).href);
const byId = new Map(models.map((m) => [m.id, m]));

function syncFile(rel) {
  const file = path.join(root, rel);
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const entry of list) {
    const model = byId.get(entry.id);
    if (!model) continue;
    if (model.authority) entry.authority = model.authority;
    if (model.assumptions) entry.assumptions = model.assumptions;
    if (model.fidelity) entry.fidelity = model.fidelity;
    if (model.topicBound) {
      delete entry.deprecated;
      delete entry.deprecatedReason;
    }
    n += 1;
  }
  fs.writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
  console.log(`${rel}: synced ${n}/${list.length}`);
}

syncFile('data/catalog.json');
syncFile('data/models.json');
