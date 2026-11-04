import { runSuite } from './suite.js';

const resultsEl = document.getElementById('results');
const summaryEl = document.getElementById('summary');
const results = runSuite();

let pass = 0;
resultsEl.innerHTML = '';
for (const r of results) {
  if (r.ok) pass += 1;
  const li = document.createElement('li');
  li.className = r.ok ? 'pass' : 'fail';
  li.innerHTML = `<span class="badge">${r.ok ? 'PASS' : 'FAIL'}</span>${r.name}`
    + (r.detail ? `<div class="detail">${r.detail}</div>` : '');
  resultsEl.appendChild(li);
}
const total = results.length;
const allOk = pass === total;
summaryEl.textContent = `${pass}/${total} 通过`;
const ink = document.documentElement.classList.contains('hc') ? '#fff' : '#000';
summaryEl.style.color = ink;
summaryEl.style.outline = allOk ? `2px solid ${ink}` : `2px dashed ${ink}`;
summaryEl.style.outlineOffset = '2px';
