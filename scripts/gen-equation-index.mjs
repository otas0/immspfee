#!/usr/bin/env node
/**
 * Teacher page: equation next to the course name, grouped by subject,
 * plus handwritten models beside the same-named course entries.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { overrideRecord } from '../js/lab/topicOverrides.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { models } = await import(pathToFileURL(path.join(root, 'js/models/index.js')).href);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const byId = new Map(models.map((m) => [m.id, m]));

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(entry) {
  const model = byId.get(entry.id);
  const equation = model?.formula || entry.formula || '';
  const fidelity = model?.fidelity || entry.fidelity || '';
  const assumptions = model?.assumptions || entry.assumptions || '';
  const authority = model?.authority || entry.authority || '';
  return `<tr>
    <td><a href="./index.html#m=${encodeURIComponent(entry.id)}">${esc(entry.name)}</a><div class="id">${esc(entry.id)}</div></td>
    <td class="eq">${esc(equation)}</td>
    <td>${esc(fidelity)}</td>
    <td>${esc(assumptions)}</td>
    <td>${esc(authority)}</td>
  </tr>`;
}

const groups = new Map();
for (const entry of catalog) {
  const domain = entry.domain || 'Other';
  const sub = entry.sub || '—';
  const key = `${domain} / ${sub}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

function runSeconds(model, seconds, extra) {
  const st = { params: { ...(model?.params || {}), ...(extra || {}) } };
  model.init(st);
  const n = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < n; i += 1) model.step(st, 1 / 60);
  return st;
}

const pidCourseId = catalog.find((e) => e.formula === '控制 · PID')?.id;
const pidCourse = byId.get(pidCourseId);
const pidTune = byId.get('pid-tune');
const pidAt1 = pidCourse ? runSeconds(pidCourse, 1, { e: 1 }) : null;
const pidLoop = pidTune ? runSeconds(pidTune, 10) : null;
const pidU = pidAt1 ? pidAt1.y.toFixed(3) : '—';
const pidOs = pidLoop && Number.isFinite(pidLoop.overshoot) ? pidLoop.overshoot.toFixed(3) : '—';

const hands = [
  {
    hand: 'free-fall',
    course: 'r001-自由落体',
    note: 'The handwritten model integrates y″ = −g − (k/m) y′ and reflects the velocity with v ← −e v. The course entry is the ideal drop y = h₀ − ½ g t² before impact, with drag set to zero. They share the k = 0 limit and are not the same solver.',
  },
  {
    hand: 'hodgkin-huxley',
    course: 'r028-神经动作电位',
    note: 'The handwritten model is the Hodgkin–Huxley 1952 gating system (GNa = 120, GK = 36, GL = 0.3 mS/cm² and the α, β rates). The course entry is only the Nernst sodium potential the spike approaches. It is not the ODE and not a dosing tool.',
  },
  {
    hand: 'pid-tune',
    course: pidCourseId,
    note: `pid-tune integrates a second-order plant with u = Kp e + Ki ∫e + Kd ė. The course entry is the step-error reduction u = Kp e + Ki e t (ė = 0). Shared defaults Kp = 1.4, Ki = 0.55, Kd = 0.12. At t = 1 with e = 1, course u = ${pidU}. pid-tune closed-loop overshoot = ${pidOs}.`,
  },
  {
    hand: 'r016-显微镜',
    course: 'r016-显微镜',
    courseEquation: overrideRecord('光学·显微镜')?.equation || 'M ≈ −(L / f_obj) · (25 cm / f_eye)',
    courseAuthority: overrideRecord('光学·显微镜')?.authority || '',
    courseAssumptions: overrideRecord('光学·显微镜')?.assumptions || '',
    note: 'Both use M ≈ −(L / f_obj) · (25 cm / f_eye) with the same defaults L = 0.16 m, f_obj = 16 mm, f_eye = 25 mm (10× objective and 10× eyepiece). The resolution d = 0.61 λ / NA is only on the handwritten assembly, not on the course angular-magnification entry.',
  },
];

const handHtml = hands.map((pair) => {
  const hand = byId.get(pair.hand);
  const courseEntry = catalog.find((e) => e.id === pair.course);
  const course = byId.get(pair.course);
  return `<section class="pair">
    <h2>${esc(hand?.name || pair.hand)} · ${esc(courseEntry?.name || pair.course)}</h2>
    <p>${esc(pair.note)}</p>
    <table>
      <thead><tr><th>Source</th><th>Id</th><th>Equation</th><th>Authority</th><th>Assumptions</th></tr></thead>
      <tbody>
        <tr><td>Handwritten</td><td>${esc(pair.hand)}</td><td class="eq">${esc(hand?.formula || 'y″ = −g − (k/m) y′ (see js/models)')}</td><td>${esc(hand?.authority || '')}</td><td>${esc(hand?.assumptions || '')}</td></tr>
        <tr><td>Course</td><td>${esc(pair.course || '')}</td><td class="eq">${esc(pair.courseEquation || course?.formula || '')}</td><td>${esc(pair.courseAuthority || course?.authority || '')}</td><td>${esc(pair.courseAssumptions || course?.assumptions || '')}</td></tr>
      </tbody>
    </table>
  </section>`;
}).join('\n');

const nav = [...groups.keys()].map((key) => {
  const id = `g-${Buffer.from(key).toString('base64url')}`;
  return `<a href="#${id}">${esc(key)}</a>`;
}).join('');

const body = [...groups.entries()].map(([key, entries]) => {
  const id = `g-${Buffer.from(key).toString('base64url')}`;
  return `<section id="${id}">
    <h2>${esc(key)} <span class="n">${entries.length}</span></h2>
    <table>
      <thead><tr><th>Name</th><th>Equation</th><th>Fidelity</th><th>Assumptions</th><th>Authority</th></tr></thead>
      <tbody>${entries.map(row).join('')}</tbody>
    </table>
  </section>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Equation index</title>
  <style>
    body { margin: 0; font: 15px/1.45 "IBM Plex Sans", "Segoe UI", sans-serif; background: #0c0c0c; color: #eee; }
    header, main { padding: 1rem 1.1rem 2rem; max-width: 1200px; margin: 0 auto; }
    a { color: #9ad; }
    h1 { font-size: 1.4rem; margin: 0 0 0.4rem; }
    h2 { font-size: 1.05rem; margin: 1.4rem 0 0.4rem; }
    .n { color: #888; font-weight: 400; }
    .lede { color: #bbb; max-width: 46rem; }
    nav { display: flex; flex-wrap: wrap; gap: 0.35rem 0.7rem; margin: 0.8rem 0 1rem; }
    nav a { font-size: 0.82rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th, td { border-bottom: 1px solid #2a2a2a; text-align: left; vertical-align: top; padding: 0.4rem 0.45rem; overflow-wrap: anywhere; }
    th { color: #aaa; font-weight: 600; }
    .eq { font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .id { color: #888; font-size: 0.72rem; }
    .pair { border: 1px solid #333; padding: 0.6rem 0.7rem; margin: 0.8rem 0; }
  </style>
</head>
<body>
  <header>
    <p><a href="./index.html">← lab</a></p>
    <h1>Equation index</h1>
    <p class="lede">Course name beside the equation that actually runs. Grouped by subject so a teacher can check the law without opening the animation. Fidelity and assumptions are the runtime text.</p>
    <h2>Handwritten and course entries</h2>
    ${handHtml}
    <nav>${nav}</nav>
  </header>
  <main>${body}</main>
</body>
</html>
`;

const out = path.join(root, 'equation-index.html');
fs.writeFileSync(out, html);
console.log(`equation-index.html groups=${groups.size} models=${models.length}`);
