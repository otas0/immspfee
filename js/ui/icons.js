/**
 * 完整线面图标（24×24），fill/stroke 均 currentColor。
 * 学术仪器风格：几何清晰、可辨识（pause/png/params 强化轮廓）。
 */
const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"';

export const ICO = {
  pause: `<svg ${attrs} fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>`,

  play: `<svg ${attrs} fill="currentColor"><path d="M7.5 4.2v15.6L19.5 12 7.5 4.2z"/></svg>`,

  reset: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 12a7.8 7.8 0 1 0 2.2-5.4"/><path d="M4.2 3.8v4.5H8.8"/></svg>`,

  cam: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="15" height="11.5" rx="2"/><path d="M17.5 10.2l4 2.3-4 2.3V10.2z" fill="currentColor" stroke="none"/><circle cx="10" cy="12.2" r="3" fill="none"/><circle cx="10" cy="12.2" r="1.15" fill="currentColor" stroke="none"/></svg>`,

  csv: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="M4 8.5h16M4 12.5h16" opacity=".45"/></svg>`,

  more: `<svg ${attrs} fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,

  params: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="10" cy="17" r="2.4" fill="currentColor" stroke="none"/></svg>`,

  close: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,

  menu: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
};

export function btnHtml(icon, label) {
  const svg = ICO[icon] || '';
  return `${svg}<span class="lbl">${label}</span>`;
}
