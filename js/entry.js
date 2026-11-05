/**
 * First module. Paint the shell and canvas before the catalog graph loads.
 */
const canvas = document.getElementById('canvas');
const wrap = document.querySelector('.canvas-wrap');
if (canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, wrap?.clientWidth || 640);
  const h = Math.max(180, wrap?.clientHeight || 360);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, w, h);
  }
}
document.documentElement.dataset.boot = 'shell';
const status = document.getElementById('boot-status');
if (status) status.hidden = true;

const stamp = new URL(import.meta.url).searchParams.get('v');
await import(stamp ? `./main.js?v=${encodeURIComponent(stamp)}` : './main.js');
document.documentElement.dataset.boot = 'ready';

if ('serviceWorker' in navigator && navigator.webdriver !== true) {
  const worker = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(worker.href, { scope: '/' }).catch(() => {});
}
