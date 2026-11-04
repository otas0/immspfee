/** 极简几何 SVG 图标（纯 currentColor） */
export const ICO = {
  pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="3" height="8" rx="0.5"/><rect x="7" y="2" width="3" height="8" rx="0.5"/></svg>',
  play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 2.1v7.8L10.2 6z"/></svg>',
  reset: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2a4.8 4.8 0 1 0 4.5 3.2H8.8v1H11V2.8h-1v1.15A5.8 5.8 0 1 1 6 .2v1z"/></svg>',
  cam: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="3.2" width="10" height="6.6" rx="1.2"/><circle cx="6" cy="6.5" r="1.8"/><rect x="7.8" y="2.1" width="2.2" height="1.2" rx="0.3"/></svg>',
  csv: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h4.2L10 4.3v6.2H3z"/><path d="M7.2 1.5V4.3H10" fill="none" stroke="currentColor" stroke-width="0.8"/></svg>',
  more: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="2.5" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="9.5" cy="6" r="1"/></svg>',
  params: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 1.2v1.4M6 9.4v1.4M1.2 6h1.4M9.4 6h1.4M2.6 2.6l1 1M8.4 8.4l1 1M9.4 2.6l-1 1M3.6 8.4l-1 1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

export function btnHtml(icon, label) {
  return `${ICO[icon] || ''}<span class="lbl">${label}</span>`;
}
