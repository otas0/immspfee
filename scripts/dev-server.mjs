#!/usr/bin/env node
/**
 * Static lab server + POST /__shots/:name for same-origin canvas PNG capture.
 * Single-instance: refuses to bind when .lab-server.pid already points at a live process
 * on the same PORT (avoids “fake service” after SIGKILL/SIGTERM races).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  domainIndex, entryStamp, fingerprint, packDomainIndex, readCatalog, rewriteIndex, specsForDomain,
} from './static-boot.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8765);
const pidPath = path.join(root, '.lab-server.pid');

function pidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPidFile() {
  try {
    const raw = fs.readFileSync(pidPath, 'utf8').trim();
    const [pidStr, portStr] = raw.split(/[\s:]+/);
    return { pid: Number(pidStr), port: Number(portStr || port) };
  } catch {
    return null;
  }
}

function acquirePidLock() {
  const existing = readPidFile();
  if (existing && existing.port === port && pidAlive(existing.pid) && existing.pid !== process.pid) {
    console.error(
      `lab server already running pid=${existing.pid} port=${existing.port} (${pidPath}). `
      + 'Stop it first, or set PORT to another value.',
    );
    process.exit(1);
  }
  try { fs.unlinkSync(pidPath); } catch { /* ignore */ }
  fs.writeFileSync(pidPath, `${process.pid} ${port}\n`);
}

function releasePidLock() {
  try {
    const cur = readPidFile();
    if (!cur || cur.pid === process.pid) fs.unlinkSync(pidPath);
  } catch { /* ignore */ }
}

acquirePidLock();
// Ignore SIGHUP so a closing launcher shell (agent / nohup) does not kill the
// lab mid-Playwright. SIGINT / SIGTERM still release the pid lock and exit.
try { process.on('SIGHUP', () => {}); } catch { /* ignore */ }
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    releasePidLock();
    process.exit(0);
  });
}
process.on('exit', releasePidLock);

const catalog = readCatalog(root);
const domains = new Set(catalog.map((spec) => spec.domain || '其他'));
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/__shots/')) {
    const name = path.basename(url.pathname);
    if (!/^[a-z0-9._-]+\.png$/i.test(name)) {
      res.writeHead(400); res.end('bad name'); return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = Buffer.concat(chunks).toString('utf8');
    if (body.startsWith('data:')) body = body.split(',', 2)[1] || '';
    const buf = Buffer.from(body, 'base64');
    const out = path.join(shots, name);
    fs.writeFileSync(out, buf);
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`ok ${buf.length}`);
    console.log('shot', name, buf.length);
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel === '/asset-stamp.json') {
    const stamp = fingerprint(root);
    const body = JSON.stringify({
      js: entryStamp(stamp),
      css: stamp.css,
      microCss: stamp.microCss,
      main: stamp.js,
      domainIndex: stamp.domainIndex,
      domains: stamp.domains,
    });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' });
    res.end(body);
    return;
  }
  if (rel === '/data/domain-index.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(packDomainIndex(domainIndex(catalog))));
    return;
  }
  if (rel.startsWith('/data/domains/') && rel.endsWith('.json')) {
    const domain = decodeURIComponent(rel.slice('/data/domains/'.length, -'.json'.length));
    if (!domains.has(domain)) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(specsForDomain(catalog, domain)));
    return;
  }
  const file = path.normalize(path.join(root, rel));
  const underRoot = file === root || file.startsWith(root + path.sep);
  if (!underRoot || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(file);
  if (rel === '/index.html') {
    const stamp = fingerprint(root);
    const html = rewriteIndex(fs.readFileSync(file, 'utf8'), stamp);
    res.writeHead(200, {
      'Content-Type': MIME['.html'],
      'Cache-Control': 'no-cache',
    });
    res.end(html);
    return;
  }
  const immutable = url.searchParams.has('v') && (ext === '.js' || ext === '.mjs' || ext === '.css' || ext === '.json');
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    ...(immutable ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
  });
  fs.createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  console.error('server error', err);
  releasePidLock();
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('uncaught', err);
});

const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  console.log(`physics-demo http://127.0.0.1:${port} (bind ${host}) pid=${process.pid}`);
});
