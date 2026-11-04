/** 纯黑白画布色板；高对比跟随 html.hc */

function packOled() {
  return {
    body: '#ffffff',
    body2: '#cccccc',
    accent: '#ffffff',
    vector: '#eeeeee',
    trail: 'rgba(255,255,255,0.3)',
    axis: '#555555',
    ground: '#777777',
    muted: '#888888',
    flash: 'rgba(255,255,255,0.4)',
    theory: '#666666',
    text: '#999999',
    bg: '#000000',
  };
}

function packHc() {
  // 与 OLED 同为黑底白笔，对比更硬
  return {
    body: '#ffffff',
    body2: '#dddddd',
    accent: '#ffffff',
    vector: '#ffffff',
    trail: 'rgba(255,255,255,0.4)',
    axis: '#666666',
    ground: '#888888',
    muted: '#aaaaaa',
    flash: 'rgba(255,255,255,0.5)',
    theory: '#777777',
    text: '#cccccc',
    bg: '#000000',
  };
}

export function getColors() {
  const hc = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hc');
  return hc ? packHc() : packOled();
}

/** 运行时取当前色（跟随 html.hc） */
export const C = new Proxy({}, {
  get(_t, prop) {
    return getColors()[prop];
  },
});
