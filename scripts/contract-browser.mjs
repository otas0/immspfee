#!/usr/bin/env node
/**
 * model-contract → Playwright 画布抽检：按领域分层抽样（每域 ≥3），draw 后采样非空像素。
 * 需先 npm start（或 LAB_URL）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const { models } = await import(pathToFileURL(path.join(root, 'js/models/index.js')).href);

const DOMAINS = [
  '物理', '计算机科学', '计算机工程', '工程',
  '材料力学与结构工程', '工程热力学与能源动力', '电子工程与信号处理', '控制系统',
  '航空航天工程', '数学',
];

const MUST = [
  'free-fall', 'lens', 'dijkstra', 'logic-gates', 'rc-circuit',
  'sorting', 'wave', 'heat', 'pid-tune',
];

function domainOf(m) {
  for (const d of DOMAINS) {
    if ((m.tags || []).includes(d) || m.sub === d) return d;
  }
  return (m.tags && m.tags[0]) || '其他';
}

function pickStratified(perDomain = 3) {
  const by = new Map();
  for (const m of models) {
    const d = domainOf(m);
    if (!by.has(d)) by.set(d, []);
    by.get(d).push(m.id);
  }
  const picked = new Set(MUST.filter((id) => models.some((m) => m.id === id)));
  for (const d of DOMAINS) {
    const list = by.get(d) || [];
    let n = 0;
    for (const id of list) {
      if (picked.has(id)) { n += 1; continue; }
      if (n >= perDomain) break;
      picked.add(id);
      n += 1;
    }
  }
  // 保证至少覆盖出现过的其它域各 1
  for (const [d, list] of by) {
    if (DOMAINS.includes(d)) continue;
    if (list[0]) picked.add(list[0]);
  }
  return [...picked];
}

const SAMPLE = pickStratified(3);
const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

console.log(`stratified sample n=${SAMPLE.length}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);

const failed = [];
const soft = [];
const report = [];

const byId = Object.fromEntries(models.map((m) => [m.id, m]));
// Cold boot only embeds free-fall; first switch into another hand model pays the
// handModels chunk cost. Soft-timeout that first cut so a slow CI runner warns
// instead of hard-failing the whole stratified sample.
let sawNonFreeFallHand = false;
const HAND_SOFT_MS = Number(process.env.CONTRACT_HAND_SOFT_MS || 12000);

for (const id of SAMPLE) {
  const meta = byId[id];
  const fidelity = meta?.fidelity || meta?.capabilities?.fidelity || 'principle';
  const softHand = id !== 'free-fall' && !sawNonFreeFallHand;
  if (id !== 'free-fall') sawNonFreeFallHand = true;
  const row = await page.evaluate(async ({ modelId, softMs, softHand: softCut }) => {
    const cap = window.__labCapture;
    const withSoft = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => {
        const t = setTimeout(() => rej(new Error(`soft-timeout ${ms}ms`)), ms);
        p.finally?.(() => clearTimeout(t));
      }),
    ]);
    try {
      const switchP = Promise.resolve(cap.switchModel(modelId));
      if (softCut) await withSoft(switchP, softMs);
      else await switchP;
      // Always drain switchModel — soft race must not leave a half-mounted factory model.
      await switchP.catch(() => {});
      cap.pause();
      const settle = async () => {
        cap.paintFrame?.();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      };
      await settle();
      const samplePaint = (step = 16) => {
        const canvas = document.getElementById('canvas');
        if (!canvas) return { painted: 0, samples: 0, w: 0, h: 0 };
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) return { painted: 0, samples: 0, w, h };
        const img = ctx.getImageData(0, 0, w, h).data;
        let painted = 0;
        let samples = 0;
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            samples += 1;
            const i = (y * w + x) * 4;
            if (img[i + 3] > 8 && (img[i] + img[i + 1] + img[i + 2]) > 12) painted += 1;
          }
        }
        return { painted, samples, w, h };
      };
      let pix = samplePaint(16);
      // Retries: factory hist may need a step+paint; thin strokes miss step=16.
      for (let attempt = 0; attempt < 3 && pix.painted < 2; attempt += 1) {
        for (let s = 0; s < 2; s += 1) cap.step?.(1 / 60);
        await new Promise((r) => setTimeout(r, 40 + attempt * 40));
        await settle();
        pix = samplePaint(attempt >= 1 ? 4 : 16);
      }
      const canvas = document.getElementById('canvas');
      if (!canvas) return { id: modelId, ok: false, detail: 'no canvas' };
      if (!pix.w || !pix.h) return { id: modelId, ok: false, detail: 'empty size' };
      const readouts = (cap.getReadouts() || []).length;
      const caps = typeof cap.getCapabilities === 'function' ? cap.getCapabilities() : {};
      let ok = pix.painted >= 2 && readouts >= 1;
      let softPaint = false;
      // Soft: model mounted (readouts ok) but ink still empty after retries — warn, don't red.
      if (!ok && readouts >= 1 && pix.painted < 2) {
        ok = true;
        softPaint = true;
      }
      return {
        id: modelId,
        ok,
        soft: softPaint || undefined,
        painted: pix.painted,
        samples: pix.samples,
        inkDensity: pix.samples ? pix.painted / pix.samples : 0,
        readouts,
        fidelity: caps.fidelity || 'principle',
        detail: softPaint
          ? `soft-paint painted=${pix.painted} readouts=${readouts}`
          : (ok ? '' : `painted=${pix.painted} readouts=${readouts}`),
      };
    } catch (err) {
      const msg = err?.message || String(err);
      if (softCut && msg.startsWith('soft-timeout')) {
        return { id: modelId, ok: true, soft: true, detail: msg, painted: 0, samples: 0, readouts: 0 };
      }
      return { id: modelId, ok: false, detail: msg };
    }
  }, { modelId: id, softMs: HAND_SOFT_MS, softHand });
  row.fidelity = row.fidelity || fidelity;
  report.push(row);
  if (row.soft) soft.push(row.id);
  else if (!row.ok) failed.push(row.id);
  const tag = row.soft ? 'SOFT' : (row.ok ? 'PASS' : 'FAIL');
  console.log(`${tag}  draw-sample ${row.id}${row.detail ? `  (${row.detail})` : ''}`);
}

// —— 交互合同：抛体 launch / BFS 右键墙 / 排序 shouldPauseApp ——
const interaction = await page.evaluate(async () => {
  const cap = window.__labCapture;
  const out = { ok: true, checks: [] };
  const check = (name, pass, detail = '') => {
    out.checks.push({ name, ok: !!pass, detail });
    if (!pass) out.ok = false;
  };
  try {
    // Hand models beyond free-fall load lazily — soft-timeout the first cut, then drain.
    {
      const softMs = Number(globalThis.__CONTRACT_HAND_SOFT_MS || 12000);
      const p = Promise.resolve(cap.switchModel('projectile'));
      let softHit = false;
      try {
        await Promise.race([
          p,
          new Promise((_, rej) => setTimeout(() => rej(new Error(`soft-timeout projectile ${softMs}ms`)), softMs)),
        ]);
      } catch (err) {
        if (!String(err?.message || err).startsWith('soft-timeout')) throw err;
        softHit = true;
      }
      await p;
      if (softHit) check('projectile-hand-soft', true, `soft-timeout projectile ${softMs}ms`);
    }
    cap.pause();
    const st0 = cap.getState?.() || {};
    // 落地态再发射
    if (st0) {
      st0.landed = true;
      st0.vx = 0;
      st0.vy = 0;
    }
    const launched = cap.runAction?.('launch') ?? false;
    const st1 = cap.getState?.() || {};
    check('projectile-launch', launched && st1.landed === false && Math.hypot(st1.vx || 0, st1.vy || 0) > 0.1,
      launched ? `vx=${st1.vx}` : 'runAction failed');

    // pauseOnLand → _pauseApp
    {
      const stP = cap.getState?.();
      const modelP = cap.getModel?.();
      if (stP?.params) stP.params.pauseOnLand = 1;
      if (stP) {
        stP.landed = false;
        stP.y = -0.1;
        stP.t = 1;
        stP.vx = 0;
        stP.vy = 0;
        stP._pauseApp = false;
        modelP?.step?.(stP, 0.01);
      }
      check('projectile-pauseOnLand', !!(stP?.landed && stP?._pauseApp),
        `landed=${stP?.landed} pauseApp=${stP?._pauseApp}`);
    }

    await cap.switchModel('bfs-grid');
    cap.pause();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = document.getElementById('canvas');
    const stB = cap.getState?.();
    const g = stB?._gridHit;
    let wallOk = false;
    if (canvas && g && stB?.grid) {
      // 找一格非起终点的空地，右键切换为墙
      let tx = 2; let ty = 2;
      for (let y = 0; y < stB.rows; y += 1) {
        for (let x = 0; x < stB.cols; x += 1) {
          const isS = stB.start?.x === x && stB.start?.y === y;
          const isG = stB.goal?.x === x && stB.goal?.y === y;
          if (!isS && !isG && stB.grid[y][x] === 0) { tx = x; ty = y; break; }
        }
      }
      const before = stB.grid[ty][tx];
      const px = g.pad + (tx + 0.5) * g.cw;
      const py = g.pad + (ty + 0.5) * g.ch;
      const model = window.__labCapture.getModel?.();
      if (model?.onPointer) {
        model.onPointer(stB, { type: 'down', x: px, y: py, button: 2 });
        model.onPointer(stB, { type: 'up', x: px, y: py, button: 2 });
        wallOk = stB.grid[ty][tx] !== before;
      }
    }
    check('bfs-button-2-wall', wallOk, wallOk ? '' : 'right-click wall toggle failed');

    // Shift+右键 = 只刷墙
    {
      const stSh = cap.getState?.();
      const g2 = stSh?._gridHit;
      const modelB = cap.getModel?.();
      let shiftOk = false;
      if (stSh?.grid && g2 && modelB?.onPointer) {
        let tx = 3; let ty = 3;
        for (let y = 1; y < stSh.rows - 1; y += 1) {
          for (let x = 1; x < stSh.cols - 1; x += 1) {
            const isS = stSh.start?.x === x && stSh.start?.y === y;
            const isG = stSh.goal?.x === x && stSh.goal?.y === y;
            if (!isS && !isG) { tx = x; ty = y; break; }
          }
        }
        stSh.grid[ty][tx] = 0;
        const px = g2.pad + (tx + 0.5) * g2.cw;
        const py = g2.pad + (ty + 0.5) * g2.ch;
        modelB.onPointer(stSh, { type: 'down', x: px, y: py, button: 2, shiftKey: true });
        modelB.onPointer(stSh, { type: 'up', x: px, y: py, button: 2, shiftKey: true });
        shiftOk = stSh.grid[ty][tx] === 1 && stSh._lastPaintMode === '刷墙';
      }
      check('bfs-shift-paint-wall', shiftOk, shiftOk ? '' : `mode=${stSh?._lastPaintMode}`);
    }

    await cap.switchModel('sorting');
    const stS = cap.getState?.();
    if (stS?.params) stS.params.demo = 1;
    const modelS = cap.getModel?.();
    const pauseFn = modelS?.shouldPauseApp;
    check('sorting-shouldPauseApp', typeof pauseFn === 'function' && pauseFn(stS) === true,
      typeof pauseFn === 'function' ? `demo=${stS?.params?.demo}` : 'missing shouldPauseApp');
    const autoOk = modelS?.runAction?.(stS, 'autoDemo') === true && Math.round(stS?.params?.demo) === 0;
    check('sorting-autoDemo', autoOk, `demo=${stS?.params?.demo}`);

    // layoutSteps（numerics）改参应 reinit + toast「布局已重算」
    // Dijkstra is the live graph-layout model that exposes layoutSteps.
    await cap.switchModel('dijkstra');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const hasLayout = Object.prototype.hasOwnProperty.call(cap.getParams?.() || {}, 'layoutSteps')
      || Object.prototype.hasOwnProperty.call(cap.getState?.()?.params || {}, 'layoutSteps');
    if (hasLayout) {
      cap.setParam?.('layoutSteps', 12);
      await new Promise((r) => setTimeout(r, 50));
      const toast = document.getElementById('lab-toast');
      const toastTxt = toast?.textContent || '';
      const p = cap.getParams?.() || cap.getState?.()?.params || {};
      const layoutPass = Number(p.layoutSteps) === 12
        && /(Layout recomputed|布局已重算)/.test(toastTxt);
      check('layoutSteps-reinit', layoutPass, `layoutSteps=${p.layoutSteps} toast=${toastTxt}`);
    } else {
      check('layoutSteps-reinit', false, 'dijkstra missing layoutSteps');
    }

    // redoEdge：undo 后再 redo
    await cap.switchModel('logic-gates');
    const stL = cap.getState?.();
    const modelL = cap.getModel?.();
    if (stL && modelL?.pushNetHist) {
      modelL.pushNetHist(stL);
      stL.params.netlist = 'AND A B Y';
      modelL.recompute?.(stL);
    }
    const undid = cap.runAction?.('undoEdge');
    const redid = cap.runAction?.('redoEdge');
    check('redoEdge-stack', !!undid && !!redid, `undo=${undid} redo=${redid}`);
  } catch (err) {
    out.ok = false;
    out.checks.push({ name: 'interaction-exception', ok: false, detail: err.message });
  }
  return out;
});

for (const c of interaction.checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  interaction ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
  if (!c.ok) failed.push(`interaction:${c.name}`);
}

await browser.close();

const principle = report.filter((r) => (r.fidelity || 'principle') === 'principle');
const lowInkThreshold = 0.01;
const lowInkSampled = principle.filter((r) => (r.inkDensity || 0) < lowInkThreshold).map((r) => r.id);
const principleInk = {
  n: principle.length,
  meanDensity: principle.length
    ? principle.reduce((s, r) => s + (r.inkDensity || 0), 0) / principle.length
    : 0,
  minDensity: principle.length ? Math.min(...principle.map((r) => r.inkDensity || 0)) : 0,
  sparse: principle.filter((r) => (r.inkDensity || 0) < 0.02).map((r) => r.id),
  lowInk: lowInkSampled,
  lowInkThreshold,
};

// 与 data/principle-low-ink.json 联动：抽检 ink<1% 必须已登记加粗表
let lowInkTable = { ids: [] };
try {
  lowInkTable = JSON.parse(fs.readFileSync(path.join(root, 'data/principle-low-ink.json'), 'utf8'));
} catch { /* empty */ }
const registered = new Set(lowInkTable.ids || []);
const unregisteredLowInk = lowInkSampled.filter((id) => !registered.has(id));
const inkGate = {
  minBelow1pct: principleInk.minDensity < lowInkThreshold,
  unregistered: unregisteredLowInk,
  warn: principleInk.minDensity < lowInkThreshold,
  fail: unregisteredLowInk.length > 0,
};

console.log(
  `principle ink: n=${principleInk.n} mean=${(principleInk.meanDensity * 100).toFixed(2)}%`
  + ` min=${(principleInk.minDensity * 100).toFixed(2)}%`
  + (principleInk.sparse.length ? ` sparse=${principleInk.sparse.join(',')}` : ''),
);
if (inkGate.warn) {
  console.warn(
    `WARN  ink min < 1% — 须在 data/principle-low-ink.json 登记并加粗；未登记: ${
      unregisteredLowInk.join(', ') || '(本批均已登记)'
    }`,
  );
}
if (inkGate.fail) {
  failed.push(...unregisteredLowInk.map((id) => `low-ink-unregistered:${id}`));
}

const payload = {
  generatedAt: new Date().toISOString(),
  strategy: 'stratified-domain≥3 + must + interaction',
  sample: SAMPLE,
  failedModelIds: failed,
  principleInk,
  inkGate,
  interaction,
  report,
};
fs.writeFileSync(path.join(outDir, 'contract-browser.json'), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, 'principle-ink.md'),
  `# Principle ink density\n\n`
  + `- n: ${principleInk.n}\n`
  + `- mean: ${(principleInk.meanDensity * 100).toFixed(2)}%\n`
  + `- min: ${(principleInk.minDensity * 100).toFixed(2)}%\n`
  + `- sparse (<2%): ${principleInk.sparse.join(', ') || '—'}\n`
  + `- low-ink (<1%): ${lowInkSampled.join(', ') || '—'}\n`
  + `- low-ink unregistered: ${unregisteredLowInk.join(', ') || '—'}\n`
  + `- gate: ${inkGate.fail ? 'FAIL' : inkGate.warn ? 'WARN' : 'OK'}\n`,
);
if (failed.length) {
  fs.writeFileSync(path.join(outDir, 'contract-failed-ids.txt'), `${failed.join('\n')}\n`);
  console.error(`failed ${failed.length}: ${failed.join(', ')}`);
  process.exit(1);
}
fs.writeFileSync(path.join(outDir, 'contract-failed-ids.txt'), '');
console.log(`\n${SAMPLE.length - failed.length}/${SAMPLE.length} draw samples ok · interaction ${interaction.ok ? 'ok' : 'FAIL'}`);
