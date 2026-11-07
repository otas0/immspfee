#!/usr/bin/env node
/**
 * Build lazy-loadable model locale packs (en / ja) from catalog.json.
 * English names must not keep Han when a gloss or ASCII id title is available.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translatePhrasesOnly } from '../js/i18n/catalogText.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
const models = Array.isArray(catalog) ? catalog : catalog.models;
const prevEnPath = join(root, 'data/locales/models-en.json');
const prevEn = existsSync(prevEnPath)
  ? JSON.parse(readFileSync(prevEnPath, 'utf8'))
  : {};

const HAND_EN = {
  'free-fall': { name: 'Free fall', description: 'Vertical fall y″=−g−(k/m)y′; tune g, height, and linear drag' },
  projectile: { name: 'Projectile motion', description: 'Launch: x=v₀ cosθ t, y=v₀ sinθ t−½gt², with optional drag' },
  pendulum: { name: 'Pendulum', description: 'Simple pendulum θ″=−(g/L)sinθ−c θ′ (large angle); tune L, g, damping, θ₀' },
  heat: { name: 'Heat conduction', description: '1D heat equation ∂T/∂t=α ∂²T/∂x² with live Dirichlet end temperatures' },
  wave: { name: 'Transverse wave', description: 'String wave y_tt=c² y_xx; length sets the grid spacing dx=L/(N+1)' },
  'double-pendulum': { name: 'Double pendulum', description: 'Two-link pendulum from the Lagrangian; chaotic sensitivity to the initial angles' },
  photoelectric: { name: 'Photoelectric effect', description: 'Einstein: K_max=max(0, hf−W) in eV; yield tracks intensity, not K_max' },
  bohr: { name: 'Bohr model', description: 'Hydrogen Bohr levels E_n=−13.6 eV/n²' },
  sorting: { name: 'Sorting', description: 'Bubble, insertion, and quicksort with compare/swap highlights' },
  'pid-tune': { name: 'PID tuning', description: 'Second-order plant ÿ+2ζωnẏ+ωn²y=Kωn²u with ideal PID; OS%, ts, IAE' },
  'beam-sfd-bmd': { name: 'Beam SFD/BMD', description: 'Shear and bending diagrams' },
  'hodgkin-huxley': { name: 'Hodgkin–Huxley', description: 'Neuron membrane dynamics' },
  lorenz: { name: 'Lorenz attractor', description: 'Lorenz (1963): x′=σ(y−x), y′=x(ρ−z)−y, z′=xy−βz' },
  orbit: { name: 'Kepler orbit', description: 'Central gravity a=−GM r̂/r²' },
  spring: { name: 'Spring oscillator', description: 'm x″=−kx−c x′; tune mass, stiffness, damping, and x₀' },
  'inclined-plane': { name: 'Inclined plane', description: 'Block on an incline: a=g(sinθ−μ cosθ)' },
  'rc-circuit': { name: 'RC circuit', description: 'RC charge and discharge with time constant τ=RC' },
  rlc: { name: 'RLC circuit', description: 'Series RLC: L I″ + R I′ + I/C = 0' },
  'standing-wave': { name: 'Standing wave', description: 'Standing wave y=sin(kx)cos(ωt) with nodes and antinodes' },
  'longitudinal-wave': { name: 'Longitudinal wave', description: 'Compressional wave: density and pressure disturbance along the direction of travel' },
  'binary-search': { name: 'Binary search', description: 'Search an ordered array by shrinking the interval' },
  'friction-pendulum': { name: 'Friction pendulum isolator', description: 'Seismic isolation hysteresis; tune friction and radius of curvature' },
  'inverted-pendulum': { name: 'Inverted pendulum', description: 'Cart–pole under PID; angle and position response' },
  'seismic-waves': { name: 'Seismic travel time', description: 'Wavefront travel time from source depth and wave speed' },
  'em-wave': { name: 'Electromagnetic wave', description: 'Plane wave with E and B perpendicular to the direction of travel' },
  'social-force': { name: 'Social-force pedestrians', description: 'Pedestrian social-force model: avoidance and crowding at an exit' },
  'crc-hamming': { name: 'CRC and Hamming', description: 'Error detection: data bits, parity bits, and an injected error' },
  'r009-玻尔兹曼分布': { name: 'Boltzmann distribution', description: 'Boltzmann factor n₂/n₁=exp(−ΔE/kT) at thermal equilibrium' },
  'r018-光电效应': { name: 'Photoelectric effect', description: 'Einstein photoelectric equation K_max=hf−W' },
  'r018-玻尔模型': { name: 'Bohr Model', description: 'Bohr hydrogen levels E_n=−13.6 eV/n²' },
  'r027-格子玻尔兹曼': { name: 'Lattice Boltzmann', description: 'D2Q9 lattice sound speed c_s=1/√3 (lattice units)' },
  'fam-orbit-v01': { name: 'Orbital motion', description: 'Kepler / central gravity: central mass, initial speed, r₀, eccentricity' },
  'fam-heat-engine-v01': { name: 'Heat engine', description: 'Heat-engine cycle (Carnot / Otto and related); compression ratio and temperature ratio' },
  'fam-photoelectric-v01': { name: 'Photoelectric effect', description: 'Einstein: K=hf−W; frequency, intensity, and work function' },
  'nasch-ca': { name: 'Nagel–Schreckenberg', description: 'Traffic cellular automaton' },
  polarization: { name: 'Polarization (Malus)', description: 'I = I₀ cos²θ' },
  'ohms-law': { name: 'Ohm’s law', description: 'V = IR readout' },
  collision: { name: '1D collision', description: 'Elastic / inelastic head-on collision' },
  'collision-2d': { name: '2D collision', description: 'Planar particle collisions' },
  'r016-显微镜': { name: 'Compound microscope', description: 'Finite-tube angular magnification and resolution' },
  dijkstra: { name: 'Dijkstra shortest path', description: 'Force-directed graph layout and shortest-path search' },
  'bfs-grid': { name: 'BFS / A* pathfinding', description: 'Grid search with walls and frontier expansion' },
  pipeline: { name: 'CPU pipeline', description: 'Five-stage pipeline with stalls and data hazards' },
  'cache-lru': { name: 'LRU cache', description: 'Hit / miss stream with capacity eviction' },
  'r001-自由落体': { name: 'Free fall', description: 'Free fall along a straight line' },
  'r001-追及相遇': { name: 'Pursuit and meeting', description: 'Pursuit and meeting at constant speed' },
  'r002-斜面滑块': { name: 'Block on an incline', description: 'Block on an incline with Coulomb friction' },
  'r005-单摆': { name: 'Simple pendulum', description: 'Simple pendulum' },
  'r005-复摆': { name: 'Physical pendulum', description: 'Physical-pendulum topic; the demo integrates the simple-pendulum equation with adjustable L' },
  'r006-横波': { name: 'Transverse wave', description: 'Traveling transverse wave; displacement is perpendicular to the direction of travel' },
  'r006-波的叠加': { name: 'Wave superposition', description: 'Coherent superposition of waves' },
  'r006-干涉': { name: 'Interference', description: 'Young interference' },
  'r006-衍射': { name: 'Diffraction', description: 'Single-slit diffraction' },
  'r007-噪声抵消': { name: 'Noise cancellation', description: 'Ideal active noise cancellation' },
  'r008-卡诺循环': { name: 'Carnot cycle', description: 'Reversible heat engine between two reservoirs (Carnot theorem)' },
  'r008-热机': { name: 'Heat engine', description: 'Heat-engine efficiency' },
  'r009-麦克斯韦速率分布': { name: 'Maxwell speed distribution', description: 'Maxwell speed distribution' },
  'r009-热传导': { name: 'Heat conduction', description: 'Fourier heat conduction' },
  'r011-潮汐': { name: 'Tide', description: 'Equilibrium tide' },
  'r013-欧姆定律': { name: 'Ohm’s law', description: 'Ohm’s law for a resistive circuit' },
  'r013-基尔霍夫': { name: 'Kirchhoff’s laws', description: 'Kirchhoff’s voltage law (KVL)' },
  'r013-串并联': { name: 'Series and parallel resistors', description: 'Series and parallel resistors' },
  'r013-交流电路': { name: 'AC circuit', description: 'AC circuit impedance' },
  'r013-谐振': { name: 'Resonance', description: 'Resonant angular frequency' },
  'r013-滤波器': { name: 'Filter', description: 'Filter cutoff frequency' },
  'r013-电桥': { name: 'Wheatstone bridge', description: 'Wheatstone bridge' },
  'r014-洛伦兹力': { name: 'Lorentz force', description: 'Cyclotron motion in a uniform magnetic field' },
  'r016-透镜成像': { name: 'Lens imaging', description: 'Thin-lens imaging' },
  'r016-像差': { name: 'Aberration', description: 'Primary aberrations' },
  'r017-薄膜干涉': { name: 'Thin-film interference', description: 'Thin-film interference' },
  'r017-衍射极限': { name: 'Diffraction limit', description: 'Circular-aperture resolution' },
  'r018-康普顿': { name: 'Compton scattering', description: 'Compton scattering' },
  'r018-德布罗意': { name: 'de Broglie', description: 'de Broglie relation for a free particle' },
  'r018-黑体辐射': { name: 'Blackbody radiation', description: 'Blackbody radiation (Stefan–Boltzmann law)' },
  'r019-薛定谔方程': { name: 'Schrödinger equation', description: 'Time-independent Schrödinger equation for a free particle' },
  'r019-谐振子': { name: 'Quantum harmonic oscillator', description: 'Quantum harmonic oscillator' },
  'r020-时间膨胀': { name: 'Time dilation', description: 'Special-relativistic time dilation' },
  'r020-洛伦兹变换': { name: 'Lorentz transformation', description: 'Lorentz transformation' },
  'r020-引力透镜': { name: 'Gravitational lens', description: 'Gravitational lens; Einstein radius of a thin lens' },
  'r020-黑洞': { name: 'Black hole', description: 'Black hole; Schwarzschild radius' },
  'r021-开普勒轨道': { name: 'Kepler orbit', description: 'Kepler orbit; Kepler’s third law' },
  'r021-潮汐': { name: 'Tide', description: 'Tidal field' },
  'r026-蔡氏电路': { name: 'Chua circuit', description: 'Chua circuit' },
  'r026-单摆大角度': { name: 'Large-angle pendulum', description: 'Large-angle pendulum' },
  'r028-蛋白质折叠': { name: 'Protein folding', description: 'Two-state protein folding' },
  'r032-斐波那契': { name: 'Fibonacci search', description: 'Fibonacci search' },
  'r032-哈希': { name: 'Hash lookup', description: 'Chained hash lookup' },
  'r032-二叉搜索树': { name: 'Binary search tree', description: 'Binary search tree' },
  'r032-跳表': { name: 'Skip list', description: 'Skip list' },
  'r032-布隆过滤器': { name: 'Bloom filter', description: 'Bloom filter' },
  'r046-哈希索引': { name: 'Hash index', description: 'Hash index' },
  'r050-一致性哈希': { name: 'Consistent hashing', description: 'Consistent hashing' },
  'r061-时序电路': { name: 'Sequential circuit', description: 'Sequential-circuit timing' },
  'r061-fpga查找表': { name: 'FPGA lookup table', description: 'FPGA lookup table (LUT)' },
  'r065-直流电机': { name: 'DC motor', description: 'DC motor back emf' },
  'r084-开普勒': { name: 'Kepler’s third law', description: 'Kepler’s third law' },
  'r096-潮汐': { name: 'Tidal energy', description: 'Tidal energy' },
  'r108-晶体衍射': { name: 'Crystal diffraction', description: 'Crystal diffraction (Bragg)' },
  'r110-博弈囚徒': { name: 'Prisoner’s dilemma', description: 'Prisoner’s dilemma: mutual defection is the pure-strategy Nash equilibrium (payoffs T>R>P>S)' },
  interference: { name: 'Interference', description: 'Double-source interference' },
  diffraction: { name: 'Diffraction', description: 'Single-slit diffraction envelope' },
  'fam-interfere-v01': { name: 'Interference', description: 'Double-source interference' },
  'fam-diffract-v01': { name: 'Diffraction', description: 'Single-slit and circular-aperture diffraction' },
  'fam-opt-diffract-v01': { name: 'Fraunhofer and Fresnel diffraction', description: 'Fraunhofer and Fresnel diffraction' },
  'fam-search-v01': { name: 'Search', description: 'Search algorithms' },
  'fam-minimize-v01': { name: 'Logic minimization', description: 'Karnaugh map / Quine–McCluskey' },
  'fam-rlc-v01': { name: 'RLC circuit', description: 'First- and second-order circuits' },
  'fam-magnetostat-v01': { name: 'Magnetostatics', description: 'Biot–Savart law' },
  'fam-maxwell-v01': { name: 'Maxwell equations', description: 'Plane wave and cavity mode' },
  hashtable: { name: 'Hash table', description: 'Chaining and open addressing' },
  'active-filter': { name: 'Active filter', description: 'Second-order transfer function (Sallen–Key)' },
};

const HAND_JA = {
  'free-fall': { name: '自由落下', description: '小球・地面・速度ベクトル；g・高さ・抗力' },
  projectile: { name: '斜方投射', description: '斜方／水平投射と抗力' },
  pendulum: { name: '単振り子', description: '糸・おもり・軌跡。L、g、減衰、初期角' },
  heat: { name: '熱伝導', description: '1次元の熱方程式。熱拡散率と端の温度' },
  wave: { name: '横波', description: '弦の横波。周波数・波長・振幅・波速' },
  photoelectric: { name: '光電効果', description: 'アインシュタインの光電方程式。振動数・強度・仕事関数' },
  'r018-玻尔模型': { name: 'ボーア模型', description: '水素のボーア準位 E_n=−13.6 eV/n²' },
  'r009-玻尔兹曼分布': { name: 'ボルツマン分布', description: '熱平衡のボルツマン因子 n₂/n₁=exp(−ΔE/kT)' },
  sorting: { name: 'ソート', description: '比較／交換のハイライト' },
  'pid-tune': { name: 'PID調整', description: '目標追従とIAE' },
  'beam-sfd-bmd': { name: '梁のSFD/BMD', description: 'せん断力・曲げモーメント図' },
  lorenz: { name: 'ローレンツアトラクタ', description: '古典的カオスODE' },
  'r016-显微镜': { name: '複合顕微鏡', description: '有限鏡筒の角倍率と分解能' },
  'double-pendulum': { name: '二重振り子', description: 'ラグランジュの二連振り子' },
  orbit: { name: 'ケプラー軌道', description: '中心力 a=−GM r̂/r²' },
  spring: { name: 'ばね振動子', description: 'm x″=−kx−c x′。質量・ばね定数・減衰・初期変位' },
  'ohms-law': { name: 'オームの法則', description: 'V=IR' },
  collision: { name: '一次元衝突', description: '弾性・非弾性の正面衝突' },
  'fam-photoelectric-v01': { name: '光電効果', description: 'K=hf−W。振動数・強度・仕事関数' },
  'fam-heat-engine-v01': { name: '熱機関', description: 'カルノー／オットー型の熱機関サイクル' },
  'nasch-ca': { name: 'NaSch交通流', description: '交通流のセルオートマトン' },
};

const HAND_KO = {
  'free-fall': { name: '자유낙하', description: '연직 낙하 y″=−g−(k/m)y′. g, 높이, 선형 저항' },
  pendulum: { name: '단진자', description: '단진자 θ″=−(g/L)sinθ−c θ′. L, g, 감쇠, θ₀' },
  heat: { name: '열전도', description: '1차원 열방정식 ∂T/∂t=α ∂²T/∂x²' },
  wave: { name: '횡파', description: '현의 횡파 y_tt=c² y_xx' },
  photoelectric: { name: '광전 효과', description: '아인슈타인: K_max=max(0, hf−W)' },
  'r018-玻尔模型': { name: '보어 모형', description: '수소 보어 준위 E_n=−13.6 eV/n²' },
  'r009-玻尔兹曼分布': { name: '볼츠만 분포', description: '열평형 볼츠만 인자 n₂/n₁=exp(−ΔE/kT)' },
  'pid-tune': { name: 'PID 조정', description: '2차 플랜트의 PID. 오버슈트, 정착 시간, IAE' },
  lorenz: { name: '로렌츠 끌개', description: '로렌츠 (1963): x′=σ(y−x), y′=x(ρ−z)−y, z′=xy−βz' },
  sorting: { name: '정렬', description: '거품·삽입·퀵 정렬의 비교와 교환' },
  'r016-显微镜': { name: '복합 현미경', description: '유한 경통의 각배율과 분해능' },
  'double-pendulum': { name: '이중 진자', description: '라그랑주 이중 진자' },
  orbit: { name: '케플러 궤도', description: '중심력 a=−GM r̂/r²' },
  spring: { name: '용수철 진동자', description: 'm x″=−kx−c x′' },
  projectile: { name: '포물체 운동', description: 'x=v₀ cosθ t, y=v₀ sinθ t−½gt²' },
  'ohms-law': { name: '옴의 법칙', description: 'V=IR' },
  collision: { name: '1차원 충돌', description: '탄성·비탄성 정면 충돌' },
  'fam-photoelectric-v01': { name: '광전 효과', description: 'K=hf−W. 진동수, 세기, 일함수' },
  'fam-heat-engine-v01': { name: '열기관', description: '카르노/오토형 열기관 사이클' },
  'nasch-ca': { name: 'NaSch 교통류', description: '교통류 셀룰러 오토마타' },
};

const HAS_HAN = /[\u4e00-\u9fff]/;

function titleFromId(id) {
  return String(id || '')
    .replace(/^fam-/, '')
    .replace(/-v\d+$/, '')
    .replace(/^r\d+-/, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function titleCaseAscii(s) {
  const raw = String(s || '').replace(/\s+/g, ' ').trim();
  if (!raw) return raw;
  return raw.replace(/(^|[^'’\p{L}\p{N}])([\p{L}])/gu, (_, a, b) => a + b.toUpperCase());
}

/** Glyph leftovers that must not be kept across a regen. */
const SALAD = /card promise|check find|this-here|this here|electric path|name-e|black-color|stack-up|tide-small|place-down|return-home|drop-liquid|expand-swell|noise-sig|resist-at|attach-text|frame-stand|frame-box|work-done|know-of|cause-to|jump-up|hold-on|trace-back|pass-on|image-like|dry involve|derive radiate|loschmidt|wheat gram|base you|surname clan|egg white|hartree rare|open general|euler ohm|virtue cloth|well general|cloth rise|two fork|wide game|follow-heel|man bright|feigenbaum annihilate|other-person|cut-off|integer flow|single swing|complex swing|free fall body|oblique face|heat transmit|heat machine|cross flow|filter wave|harmonic vibrate|lead force|through mirror|straight flow|electric machine|fibonacci wave|that-one|and-also|series and link|fixed name|schrodinger fixed|return return|logic edit|crystal body|batch return|ladder degree|page place|solve release|stop-up|block-off|spread-out|order-rank|order-seq|from-here|wave-hand|only-one|rise pulse|yield-out|plug-up|vehicle-count|plate-coat|damage-hurt|soft-flex|cut-down|capture-take|item-eye|box-small|red-deep|wall-face|cover-over|release-ion|drive-shaft|outline-plan|net-pure|contain-in|must-be|not-yet|give-back|visit-call|key-button|break-apart|condition-state|extend-out|certain-one|long-time|grip-handle|discuss-over|pulse-beat|operate-run|set-up|force study|object principle|overall count|near substitute|light study|magnetic study|electric study|number based|monitor supervise|spirit warp/i;

function looksSalad(s) {
  return SALAD.test(String(s || ''));
}

function englishName(m) {
  const hand = HAND_EN[m.id];
  if (hand?.name) return hand.name;
  const kept = prevEn[m.id]?.name;
  const phrased = translatePhrasesOnly('en', m.name || '');
  const keptBad = !kept || HAS_HAN.test(kept) || looksSalad(kept);
  if (phrased && keptBad) return titleCaseAscii(phrased);
  if (kept && !HAS_HAN.test(kept)) return kept;
  if (m.name && !HAS_HAN.test(m.name) && !looksSalad(m.name)) return m.name;
  if (phrased) return titleCaseAscii(phrased);
  const ascii = String(m.id || '').replace(/[^\x00-\x7F]+/g, ' ').replace(/[-_]+/g, ' ').trim();
  return titleCaseAscii(titleFromId(ascii) || ascii || m.id);
}

function packEn(m) {
  const hand = HAND_EN[m.id];
  if (hand) return { name: hand.name, description: hand.description || hand.name };
  const name = englishName(m);
  const prevDesc = prevEn[m.id]?.description;
  if (prevDesc && !HAS_HAN.test(prevDesc) && !looksSalad(prevDesc)) {
    return { name, description: prevDesc };
  }
  const formula = String(m.formula || '');
  if (formula && /^[\x00-\x7F]+$/.test(formula) && !looksSalad(formula)) {
    return { name, description: formula };
  }
  const phrased = translatePhrasesOnly('en', formula || '');
  if (phrased && !looksSalad(phrased)) return { name, description: phrased };
  return { name, description: name };
}

function packJa(m) {
  const hand = HAND_JA[m.id];
  if (hand) return hand;
  const name = /[\u3040-\u30ff\u3400-\u9fff]/.test(m.name || '') ? m.name : titleFromId(m.id);
  return { name, description: m.description || m.formula || name };
}

const en = {};
const ja = {};
const ko = {};
let hanLeft = 0;
let cleaned = 0;
for (const m of models) {
  if (!m?.id) continue;
  en[m.id] = packEn(m);
  ja[m.id] = packJa(m);
  if (HAND_KO[m.id]) ko[m.id] = { ...HAND_KO[m.id] };
  if (HAS_HAN.test(en[m.id].name || '') || HAS_HAN.test(en[m.id].description || '')) hanLeft += 1;
  const prev = prevEn[m.id];
  if (prev && (prev.name !== en[m.id].name || prev.description !== en[m.id].description)) cleaned += 1;
}

const outDir = join(root, 'data/locales');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'models-en.json'), JSON.stringify(en));
writeFileSync(join(outDir, 'models-ja.json'), JSON.stringify(ja));
writeFileSync(join(outDir, 'models-ko.json'), JSON.stringify(ko));
console.log(`wrote models-en.json / models-ja.json / models-ko.json (${Object.keys(en).length} ids, en cleaned ${cleaned}, en Han left ${hanLeft}, ko ${Object.keys(ko).length})`);
if (hanLeft) process.exitCode = 1;
