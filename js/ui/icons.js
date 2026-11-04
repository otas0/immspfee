/**
 * 完整线面图标（24×24），fill/stroke 均 currentColor。
 * 学术仪器风格：几何清晰、可辨识。
 */
const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"';

export const ICO = {
  pause: `<svg ${attrs} fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,

  play: `<svg ${attrs} fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5z"/></svg>`,

  reset: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.1-5.2"/><path d="M4.5 4.5v4.2H8.7" fill="none"/></svg>`,

  cam: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.25"/><path d="M8 7l1.2-2h5.6L16 7"/><circle cx="12" cy="13" r="1.1" fill="currentColor" stroke="none"/></svg>`,

  csv: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4"/><path d="M10 12h6M10 15.5h6M10 19h3.5"/></svg>`,

  more: `<svg ${attrs} fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>`,

  params: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2.25" fill="currentColor" stroke="none"/><circle cx="15" cy="16" r="2.25" fill="currentColor" stroke="none"/></svg>`,

  close: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,

  menu: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
};

export function btnHtml(icon, label) {
  const svg = ICO[icon] || '';
  return `${svg}<span class="lbl">${label}</span>`;
}
