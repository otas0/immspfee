#!/usr/bin/env node
/**
 * 100× immersion: oilBlend reaches ≥0.95 with getOilRiseElapsed in 0.3–0.6 s.
 * Rise is linear (~0.45 s). Fall to dry (40×) is linear over getOilFallSec() 0.32 s.
 * oilVisible = blend > 0.02 (shader path). Mid-fall still tints the slide.
 * Requires lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium, webkit } from 'playwright';
const useWebkit = process.env.MICRO_BROWSER === 'webkit';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`;

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

function assertOilScreenOnCanvas(tag, sample) {
  if (viewport.width > 420) return;
  const s = sample?.screen;
  const w = Number(sample?.canvasW) || viewport.width;
  const h = Number(sample?.canvasH) || viewport.height;
  if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) {
    fail(`${tag}: getOilScreen missing on ${viewport.width}px (${JSON.stringify(s)})`);
  }
  if (!(s.x >= 0 && s.y >= 0 && s.x <= w && s.y <= h)) {
    fail(`${tag}: getOilScreen off-canvas ${JSON.stringify(s)} canvas ${w}x${h}`);
  }
}

function parseViewport() {
  const raw = process.env.VIEWPORT || '1280x800';
  const m = /^(\d+)x(\d+)$/.exec(raw);
  if (!m) fail(`VIEWPORT must be WxH, got ${raw}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

const viewport = parseViewport();
console.log('micro-oil browser', useWebkit ? 'webkit' : 'chromium', `${viewport.width}x${viewport.height}`);
const browser = await (useWebkit ? webkit : chromium).launch({ headless: true });
const page = await browser.newPage({ viewport });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.stageMode === 'webgl3d',
    null,
    { timeout: 90000 },
  );
  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.add('is-open');
  });
  await page.waitForTimeout(350);
  const before = await page.evaluate(() => {
    window.__labCapture.paintFrame?.();
    const stage = window.__labCapture.getWebglStage();
    return {
      obj: window.__labCapture.getParams()?.objective,
      blend: stage.getOilBlend(),
      rise: stage.getOilRiseSec(),
    };
  });
  if (!(Math.abs(before.rise - 0.45) < 1e-6)) fail(`getOilRiseSec ${before.rise} expected 0.45`);
  await page.click('#micro-obj [data-obj="100x"]', { timeout: 15000 });

  let sample = null;
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline) {
    sample = await page.evaluate(() => {
      window.__labCapture.paintFrame?.();
      const stage = window.__labCapture.getWebglStage();
      const p = window.__labCapture.getParams() || {};
      return {
        obj: p.objective,
        blend: stage.getOilBlend(),
        elapsed: stage.getOilRiseElapsed(),
        rise: stage.getOilRiseSec(),
      };
    });
    if (sample.blend >= 0.95) break;
    await page.waitForTimeout(16);
  }
  console.log('oil-blend', JSON.stringify({ before, sample }));
  if (!sample || sample.obj !== '100x') fail(`objective did not stick at 100x (${sample?.obj})`);
  if (!(sample.blend >= 0.95)) fail(`oilBlend ${sample.blend} never reached 0.95`);
  if (!(sample.elapsed >= 0.3 && sample.elapsed <= 0.6)) {
    fail(`oil rise elapsed ${sample.elapsed}s outside 0.3–0.6 (blend ${sample.blend})`);
  }

  await page.evaluate(() => {
    window.__oilProbe = () => {
      window.__labCapture.paintFrame?.();
      const stage = window.__labCapture.getWebglStage();
      const canvas = document.getElementById('canvas-webgl');
      const blend = stage.getOilBlend();
      const screen = typeof stage.getOilScreen === 'function' ? stage.getOilScreen() : null;
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      let oilish = 0;
      let n = 0;
      let br = 0;
      if (screen && gl && canvas.width > 0) {
        const sx = canvas.width / Math.max(1, canvas.clientWidth);
        const sy = canvas.height / Math.max(1, canvas.clientHeight);
        const cx = Math.round(screen.x * sx);
        const cy = Math.round(screen.y * sy);
        const half = 10;
        const x0 = Math.max(0, Math.min(canvas.width - 1, cx - half));
        const yTop = Math.max(0, Math.min(canvas.height - 1, cy - half));
        const w = Math.max(1, Math.min(half * 2, canvas.width - x0));
        const h = Math.max(1, Math.min(half * 2, canvas.height - yTop));
        const glY = Math.max(0, canvas.height - (yTop + h));
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(x0, glY, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        for (let i = 0; i < buf.length; i += 4) {
          const r = buf[i];
          const g = buf[i + 1];
          const b = buf[i + 2];
          n += 1;
          br += b - r;
          // Immersion cyan (low red) — slide glass stays high-red and does not match.
          if (b > 48 && r < 150 && b > r * 1.35) oilish += 1;
        }
      }
      const oilVisible = blend > 0.02;
      return {
        blend,
        oilish,
        n,
        meanBR: n ? br / n : 0,
        oilVisible,
        apiVisible: typeof stage.oilVisible === 'function' ? stage.oilVisible() : oilVisible,
        fall: typeof stage.getOilFallElapsed === 'function' ? stage.getOilFallElapsed() : null,
        fallSec: typeof stage.getOilFallSec === 'function' ? stage.getOilFallSec() : null,
        screen: screen ? { x: screen.x, y: screen.y, r: screen.r } : null,
        canvasW: canvas ? canvas.clientWidth : 0,
        canvasH: canvas ? canvas.clientHeight : 0,
      };
    };
  });

  const risen = await page.evaluate(() => window.__oilProbe());
  console.log('oil-rise-pixels', JSON.stringify(risen));
  if (!(Math.abs(risen.fallSec - 0.32) < 1e-6)) fail(`getOilFallSec ${risen.fallSec} expected 0.32`);
  if (risen.oilVisible !== true || risen.apiVisible !== true) {
    fail(`oilVisible should be true at blend ${risen.blend}`);
  }
  if (!(risen.blend >= 0.95)) fail(`blend dropped before pixel sample (${risen.blend})`);
  if (!(risen.oilish >= 4)) {
    fail(`rise blend ${risen.blend} expected blue-ish oil pixels, oilish=${risen.oilish} screen=${JSON.stringify(risen.screen)}`);
  }
  assertOilScreenOnCanvas('rise', risen);

  const fall = await page.evaluate(async () => {
    document.querySelector('#micro-obj [data-obj="40x"]')?.click();
    const t0 = performance.now();
    let mid = null;
    let done = null;
    const trace = [];
    while (performance.now() - t0 < 1600) {
      const s = window.__oilProbe();
      trace.push({ blend: Number(s.blend.toFixed(3)), oilish: s.oilish, fall: s.fall, oilVisible: s.oilVisible });
      if (!mid && s.blend <= 0.85 && s.blend >= 0.15) mid = s;
      if (s.blend <= 0.05) {
        done = s;
        break;
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
    let dry = done;
    if (done && done.blend > 0.02) {
      const tDry = performance.now();
      while (performance.now() - tDry < 800) {
        dry = window.__oilProbe();
        if (dry.blend <= 0.02) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    return { mid, done, dry, wallMs: performance.now() - t0, trace: trace.filter((_, i) => i % 2 === 0).slice(0, 24) };
  });
  console.log('oil-fall', JSON.stringify(fall));
  if (!fall.done) fail('oil blend never fell to ≤0.05 after 40×');
  if (!fall.mid) fail(`missed mid-fall sample (blend 0.15–0.85); last=${fall.done.blend}`);
  const fallElapsed = fall.done.fall;
  if (typeof fallElapsed === 'number') {
    if (!(fallElapsed >= 0.2 && fallElapsed <= 0.5)) {
      fail(`oil fall elapsed ${fallElapsed}s outside 0.2–0.5 (blend ${fall.done.blend})`);
    }
  } else {
    const wall = fall.wallMs / 1000;
    if (!(wall >= 0.2 && wall <= 0.5)) fail(`oil fall wall clock ${wall}s outside 0.2–0.5`);
  }
  if (fall.mid.oilVisible !== true) fail(`mid-fall oilVisible false at blend ${fall.mid.blend}`);
  assertOilScreenOnCanvas('mid-fall', fall.mid);
  if (!(fall.mid.oilish >= 3)) {
    fail(`mid-fall blend ${fall.mid.blend} lost oil tint, oilish=${fall.mid.oilish}`);
  }
  const dry = fall.dry || fall.done;
  if (!(dry.blend <= 0.02)) fail(`oil blend did not settle ≤0.02 (${dry.blend})`);
  if (dry.oilVisible !== false) fail(`oilVisible still true at blend ${dry.blend}`);
  if (dry.oilish > 2) fail(`oil pixels remained after fall (oilish=${dry.oilish})`);
  console.log('test:micro-oil ok');
} finally {
  await browser.close();
}
