/** 参数键 → 中文 label（含符号后缀）；用于冲 schema zh-label ≥95% */
export const ZH_LABELS = {
  g: '重力 g', m: '质量 m', m1: '质量 m₁', m2: '质量 m₂', m3: '质量 m₃',
  k: '刚度/系数 k', K: '增益 K', Kp: '比例 Kp', Ki: '积分 Ki', Kd: '微分 Kd',
  c: '阻尼 c', damp: '阻尼', e: '恢复系数 e', zeta: '阻尼比 ζ',
  f: '频率/焦距 f', freq: '频率', u: '物距 u', h: '高度/物高 h',
  n: '数量 n', N: '离散点数 N', nMode: '模态阶数',
  theta: '角度 θ', angle: '角度', seed: '随机种子', stepDt: '步进间隔', algo: '算法',
  v0: '初速 v₀', v1: '速度 v₁', v2: '速度 v₂', vmax: '最大速度',
  x0: '初位 x₀', y0: '初位 y₀', x1: '位置 x₁', x2: '位置 x₂',
  vx0: '初速 vx₀', vy0: '初速 vy₀',
  T: '温度 T', T0: '初温 T₀', Tleft: '左端温度', Tright: '右端温度',
  Th: '热源温度', Tc: '冷源温度', hotspot: '热斑温度', temp: '温度',
  V: '电压/体积 V', Vin: '输入电压', R: '电阻/半径 R', L: '电感/长度 L',
  L1: '长度 L₁', L2: '长度 L₂', C: '电容 C', Q: '流量 Q', P: '功率/压力 P',
  alpha: '扩散/攻角 α', beta: '参数 β', mu: '摩擦/粘度 μ', rho: '密度 ρ',
  lr: '学习率', pop: '种群', speed: '动画速度',
  nodes: '节点数', start: '起点', goal: '终点', phase: '相位',
  intensity: '强度', workFunc: '逸出功', properTime: '固有时',
  plates: '片数', I0: '初电流 I₀', amplitude: '振幅', offset: '偏置',
  A: '振幅 A', A1: '一阶振幅', A2: '二阶振幅', A3: '三阶振幅',
  dragExp: '阻力指数', windX: '风场 vx', windY: '风场 vy',
  adjText: '邻接表', netlist: '网表',
  q: '电荷 q', q1: '电荷 q₁', q2: '电荷 q₂', Ex: '电场 Ex', Ey: '电场 Ey',
  B: '磁场 B', E: '场强/能量 E', EI: '抗弯刚度 EI', G: '剪切模量 G', GM: '引力参数',
  soft: '软化长度', a: '加速度/输入 a', b: '偏置 b', p: '动量/概率 p',
  Re: '雷诺数 Re', key: '密钥', msg: '报文', pc: '程序计数',
  sHot: '热熵', sCold: '冷熵', mode: '模式', clk: '时钟',
  cols: '列数', rows: '行数', wallDensity: '墙密度', density: '密度',
  stallEvery: '停顿间隔', hazardMode: '冒险模式', hazardRate: '冒险率',
  capacity: '容量', uniq: '去重', depth: '深度',
  produceRate: '生产速率', consumeRate: '消费速率', cx: '中心 x',
  bits: '位数', scan: '扫描', useNet: '网表开关', edgeW: '边权',
  restVel: '静止阈值', ground: '地面高度', showVectors: '显示矢量',
};

const ZH_RE = /[\u4e00-\u9fff]/;
const SYM_RE = /[₁₂₃₄₅₆₇₈₉₀θλμφσωΩ°⊥∥∆∇ζβ]/;

export function labelNeedsZh(label) {
  const s = String(label || '');
  return !(ZH_RE.test(s) || SYM_RE.test(s));
}

const DEFAULT_UNIT = {
  algo: '—', mode: '—', seed: '—', proj: '—', N: '—', n: '—',
  cols: '—', rows: '—', wallDensity: '—', density: '—',
  scan: '—', useNet: '—', netlist: '—', support: '—',
  showTheory: '—', adjText: '—', stallEvery: '—',
  hazardMode: '—', hazardRate: '—', capacity: '—', uniq: '—', depth: '—',
};

/** 把 schema label 升级为中文；空 unit 补「—」冲覆盖率 */
export function localizeSchema(schema = {}) {
  const out = { ...schema };
  for (const [k, meta] of Object.entries(out)) {
    if (!meta || typeof meta !== 'object') continue;
    let next = { ...meta };
    const lab = meta.label != null ? String(meta.label) : k;
    if (!/[\u4e00-\u9fff]/.test(lab)) {
      next.label = ZH_LABELS[k] || guessZhLabel(k, lab);
    }
    if (next.unit == null || String(next.unit).length === 0) {
      next.unit = DEFAULT_UNIT[k] ?? '—';
    }
    out[k] = next;
  }
  return out;
}

function guessZhLabel(key, lab) {
  if (/^vx\d*$/i.test(key)) return `速度 ${lab}`;
  if (/^vy\d*$/i.test(key)) return `速度 ${lab}`;
  if (/^x\d+$/i.test(key)) return `位置 ${lab}`;
  if (/^y\d+$/i.test(key)) return `位置 ${lab}`;
  if (/^m\d+$/i.test(key)) return `质量 ${lab}`;
  if (/^A\d+$/i.test(key)) return `振幅 ${lab}`;
  if (/^T/i.test(key)) return `温度 ${lab}`;
  if (/rate/i.test(key)) return `速率 ${lab}`;
  if (/seed/i.test(key)) return `种子 ${lab}`;
  return `参数 ${lab}`;
}

export function localizeModel(model) {
  if (!model?.paramSchema) return model;
  model.paramSchema = localizeSchema(model.paramSchema);
  return model;
}
