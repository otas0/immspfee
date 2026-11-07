/**
 * Whitelist translation for assumption bodies and formula bars.
 * PHRASE_TABLE matches before the character lexicon so names such as 玻尔兹曼
 * stay intact. Longer phrases win. glyphRows loads on demand so Chinese boots
 * skip the lexicon; phrases still apply when the lexicon is not loaded.
 */
const IDX = { en: 0, ja: 1, ko: 2, es: 3, fr: 4, de: 5 };
const PUNCT = {
  en: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
  ja: { '、': '、', '；': '。', '，': '、', '。': '。' },
  ko: { '、': ', ', '；': '. ', '，': ', ', '。': '. ' },
  es: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
  fr: { '、': ' ; ', '；': ' ; ', '，': ', ', '。': '. ' },
  de: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
};

/**
 * Multi-character phrases matched before the glyph walk.
 * Columns match glyph rows: zh, en, ja, ko, es, fr, de.
 * Longer keys win (sorted at load), so 格子玻尔兹曼 beats 玻尔兹曼.
 */
export const PHRASE_TABLE = [
  ['格子玻尔兹曼', 'lattice Boltzmann', '格子ボルツマン', '격자 볼츠만', 'Boltzmann en red', 'Boltzmann sur réseau', 'Lattice-Boltzmann'],
  ['麦克斯韦速率分布', 'Maxwell speed distribution', 'マクスウェルの速さ分布', '맥스웰 속력 분포', 'distribución de rapidez de Maxwell', 'distribution des vitesses de Maxwell', 'Maxwell-Geschwindigkeitsverteilung'],
  ['一致性哈希', 'consistent hashing', 'コンシステントハッシュ', '일관된 해싱', 'hash consistente', 'hachage cohérent', 'konsistentes Hashing'],
  ['二叉搜索树', 'binary search tree', '二分探索木', '이진 탐색 트리', 'árbol binario de búsqueda', 'arbre binaire de recherche', 'binärer Suchbaum'],
  ['布隆过滤器', 'Bloom filter', 'ブルームフィルタ', '블룸 필터', 'filtro de Bloom', 'filtre de Bloom', 'Bloom-Filter'],
  ['蛋白质折叠', 'protein folding', 'タンパク質の折りたたみ', '단백질 접힘', 'plegamiento de proteínas', 'repliement des protéines', 'Proteinfaltung'],
  ['单摆大角度', 'large-angle pendulum', '大振幅の単振り子', '큰 진폭 단진자', 'péndulo de gran ángulo', 'pendule à grand angle', 'Pendel bei großem Winkel'],
  ['薄膜干涉', 'thin-film interference', '薄膜干渉', '박막 간섭', 'interferencia de película delgada', 'interférence en lame mince', 'Dünnschichtinterferenz'],
  ['惠斯通电桥', 'Wheatstone bridge', 'ホイートストンブリッジ', '휘트스톤 브리지', 'puente de Wheatstone', 'pont de Wheatstone', 'Wheatstone-Brücke'],
  ['毕奥-萨伐尔', 'Biot–Savart', 'ビオ・サバール', '비오-사바르', 'Biot–Savart', 'Biot–Savart', 'Biot–Savart'],
  ['批归一化', 'batch normalization', 'バッチ正規化', '배치 정규화', 'normalización por lotes', 'normalisation par lots', 'Batch-Normalisierung'],
  ['线性回归', 'linear regression', '線形回帰', '선형 회귀', 'regresión lineal', 'régression linéaire', 'lineare Regression'],
  ['逻辑回归', 'logistic regression', 'ロジスティック回帰', '로지스틱 회귀', 'regresión logística', 'régression logistique', 'logistische Regression'],
  ['梯度下降', 'gradient descent', '勾配降下', '경사 하강', 'descenso de gradiente', 'descente de gradient', 'Gradientenabstieg'],
  ['薛定谔方程', 'Schrödinger equation', 'シュレーディンガー方程式', '슈뢰딩거 방정식', 'ecuación de Schrödinger', 'équation de Schrödinger', 'Schrödinger-Gleichung'],
  ['卡诺循环', 'Carnot cycle', 'カルノーサイクル', '카르노 사이클', 'ciclo de Carnot', 'cycle de Carnot', 'Carnot-Kreisprozess'],
  ['卡诺图', 'Karnaugh map', 'カルノー図', '카르노 맵', 'mapa de Karnaugh', 'tableau de Karnaugh', 'Karnaugh-Diagramm'],
  ['开普勒轨道', 'Kepler orbit', 'ケプラー軌道', '케플러 궤도', 'órbita de Kepler', 'orbite de Kepler', 'Kepler-Bahn'],
  ['洛伦兹变换', 'Lorentz transformation', 'ローレンツ変換', '로런츠 변환', 'transformación de Lorentz', 'transformation de Lorentz', 'Lorentz-Transformation'],
  ['洛伦兹力', 'Lorentz force', 'ローレンツ力', '로런츠 힘', 'fuerza de Lorentz', 'force de Lorentz', 'Lorentzkraft'],
  ['光电效应', 'photoelectric effect', '光電効果', '광전 효과', 'efecto fotoeléctrico', 'effet photoélectrique', 'Photoeffekt'],
  ['黑体辐射', 'blackbody radiation', '黒体放射', '흑체 복사', 'radiación de cuerpo negro', 'rayonnement du corps noir', 'Hohlraumstrahlung'],
  ['热传导', 'heat conduction', '熱伝導', '열전도', 'conducción térmica', 'conduction thermique', 'Wärmeleitung'],
  ['自由落体', 'free fall', '自由落下', '자유낙하', 'caída libre', 'chute libre', 'freier Fall'],
  ['欧姆定律', 'Ohm’s law', 'オームの法則', '옴의 법칙', 'ley de Ohm', 'loi d’Ohm', 'ohmsches Gesetz'],
  ['交流电路', 'AC circuit', '交流回路', '교류 회로', 'circuito de CA', 'circuit alternatif', 'Wechselstromkreis'],
  ['时序电路', 'sequential circuit', '順序回路', '순차 회로', 'circuito secuencial', 'circuit séquentiel', 'Schaltwerk'],
  ['蔡氏电路', 'Chua circuit', 'チュア回路', '추아 회로', 'circuito de Chua', 'circuit de Chua', 'Chua-Schaltkreis'],
  ['透镜成像', 'lens imaging', 'レンズ結像', '렌즈 결상', 'formación de imagen por lente', 'imagerie par lentille', 'Linsenabbildung'],
  ['衍射极限', 'diffraction limit', '回折限界', '회절 한계', 'límite de difracción', 'limite de diffraction', 'Beugungsgrenze'],
  ['引力透镜', 'gravitational lens', '重力レンズ', '중력 렌즈', 'lente gravitatoria', 'lentille gravitationnelle', 'Gravitationslinse'],
  ['时间膨胀', 'time dilation', '時間の遅れ', '시간 지연', 'dilatación temporal', 'dilatation du temps', 'Zeitdilatation'],
  ['波的叠加', 'wave superposition', '波の重ね合わせ', '파동의 중첩', 'superposición de ondas', 'superposition d’ondes', 'Wellenüberlagerung'],
  ['噪声抵消', 'noise cancellation', '騒音キャンセリング', '소음 상쇄', 'cancelación de ruido', 'annulation de bruit', 'Geräuschunterdrückung'],
  ['追及相遇', 'pursuit and meeting', '追及と会合', '추격과 만남', 'persecución y encuentro', 'poursuite et rencontre', 'Einholen und Treffen'],
  ['斜面滑块', 'block on an incline', '斜面上のブロック', '빗면 위 물체', 'bloque en un plano inclinado', 'bloc sur un plan incliné', 'Klotz auf der schiefen Ebene'],
  ['博弈囚徒', 'prisoner’s dilemma', '囚人のジレンマ', '죄수의 딜레마', 'dilema del prisionero', 'dilemme du prisonnier', 'Gefangenendilemma'],
  ['晶体衍射', 'crystal diffraction', '結晶回折', '결정 회절', 'difracción cristalina', 'diffraction cristalline', 'Kristallbeugung'],
  ['直流电机', 'DC motor', '直流モータ', '직류 전동기', 'motor de CC', 'moteur à courant continu', 'Gleichstrommotor'],
  ['查找算法', 'search algorithm', '探索アルゴリズム', '검색 알고리즘', 'algoritmo de búsqueda', 'algorithme de recherche', 'Suchalgorithmus'],
  ['查找表', 'lookup table', 'ルックアップテーブル', '룩업 테이블', 'tabla de consulta', 'table de correspondance', 'Nachschlagetabelle'],
  ['哈希索引', 'hash index', 'ハッシュ索引', '해시 색인', 'índice hash', 'index de hachage', 'Hashindex'],
  ['开放寻址', 'open addressing', 'オープンアドレス法', '개방 주소법', 'direccionamiento abierto', 'adressage ouvert', 'offene Adressierung'],
  ['传递函数', 'transfer function', '伝達関数', '전달 함수', 'función de transferencia', 'fonction de transfert', 'Übertragungsfunktion'],
  ['谐振子', 'harmonic oscillator', '調和振動子', '조화 진동자', 'oscilador armónico', 'oscillateur harmonique', 'harmonischer Oszillator'],
  ['夫琅禾费', 'Fraunhofer', 'フラウンホーファー', '프라운호퍼', 'Fraunhofer', 'Fraunhofer', 'Fraunhofer'],
  ['菲涅耳', 'Fresnel', 'フレネル', '프레넬', 'Fresnel', 'Fresnel', 'Fresnel'],
  ['斐波那契', 'Fibonacci', 'フィボナッチ', '피보나치', 'Fibonacci', 'Fibonacci', 'Fibonacci'],
  ['感知机', 'perceptron', 'パーセプトロン', '퍼셉트론', 'perceptrón', 'perceptron', 'Perzeptron'],
  ['归一化', 'normalization', '正規化', '정규화', 'normalización', 'normalisation', 'Normierung'],
  ['链地址', 'separate chaining', 'チェイン法', '체이닝', 'encadenamiento', 'chaînage', 'Verkettung'],
  ['平面波', 'plane wave', '平面波', '평면파', 'onda plana', 'onde plane', 'ebene Welle'],
  ['串并联', 'series-parallel', '直並列', '직병렬', 'serie-paralelo', 'série-parallèle', 'Reihen-Parallel'],
  ['基尔霍夫', 'Kirchhoff', 'キルヒホッフ', '키르히호프', 'Kirchhoff', 'Kirchhoff', 'Kirchhoff'],
  ['德布罗意', 'de Broglie', 'ド・ブロイ', '드브로이', 'de Broglie', 'de Broglie', 'de Broglie'],
  ['玻尔兹曼', 'Boltzmann', 'ボルツマン', '볼츠만', 'Boltzmann', 'Boltzmann', 'Boltzmann'],
  ['薛定谔', 'Schrödinger', 'シュレーディンガー', '슈뢰딩거', 'Schrödinger', 'Schrödinger', 'Schrödinger'],
  ['麦克斯韦', 'Maxwell', 'マクスウェル', '맥스웰', 'Maxwell', 'Maxwell', 'Maxwell'],
  ['开普勒', 'Kepler', 'ケプラー', '케플러', 'Kepler', 'Kepler', 'Kepler'],
  ['康普顿', 'Compton', 'コンプトン', '콤프턴', 'Compton', 'Compton', 'Compton'],
  ['洛伦兹', 'Lorentz', 'ローレンツ', '로런츠', 'Lorentz', 'Lorentz', 'Lorentz'],
  ['洛伦茨', 'Lorentz', 'ローレンツ', '로런츠', 'Lorentz', 'Lorentz', 'Lorentz'],
  ['卡尔曼滤波', 'Kalman filter', 'カルマンフィルタ', '칼만 필터', 'filtro de Kalman', 'filtre de Kalman', 'Kalman-Filter'],
  ['卡尔曼', 'Kalman', 'カルマン', '칼만', 'Kalman', 'Kalman', 'Kalman'],
  ['蒙特卡洛', 'Monte Carlo', 'モンテカルロ', '몬테카를로', 'Monte Carlo', 'Monte Carlo', 'Monte Carlo'],
  ['红黑树', 'red-black tree', '赤黒木', '레드-블랙 트리', 'árbol rojinegro', 'arbre rouge-noir', 'Rot-Schwarz-Baum'],
  ['引力波', 'gravitational wave', '重力波', '중력파', 'onda gravitatoria', 'onde gravitationnelle', 'Gravitationswelle'],
  ['狄塞尔', 'Diesel', 'ディーゼル', '디젤', 'Diesel', 'Diesel', 'Diesel'],
  ['滤波器', 'filter', 'フィルタ', '필터', 'filtro', 'filtre', 'Filter'],
  ['黑体', 'blackbody', 'ブラックボディ', '흑체', 'cuerpo negro', 'corps noir', 'Schwarzer Körper'],
  ['复摆', 'physical pendulum', '物理振り子', '물리 진자', 'péndulo físico', 'pendule physique', 'physikalisches Pendel'],
  ['单摆', 'simple pendulum', '単振り子', '단진자', 'péndulo simple', 'pendule simple', 'Fadenpendel'],
  ['横波', 'transverse wave', '横波', '횡파', 'onda transversal', 'onde transversale', 'Transversalwelle'],
  ['斜面', 'inclined plane', '斜面', '빗면', 'plano inclinado', 'plan incliné', 'schiefe Ebene'],
  ['衍射', 'diffraction', '回折', '회절', 'difracción', 'diffraction', 'Beugung'],
  ['干涉', 'interference', '干渉', '간섭', 'interferencia', 'interférence', 'Interferenz'],
  ['电路', 'circuit', '回路', '회로', 'circuito', 'circuit', 'Stromkreis'],
  ['热机', 'heat engine', '熱機関', '열기관', 'máquina térmica', 'machine thermique', 'Wärmekraftmaschine'],
  ['潮汐', 'tide', '潮汐', '조석', 'marea', 'marée', 'Gezeiten'],
  ['黑洞', 'black hole', 'ブラックホール', '블랙홀', 'agujero negro', 'trou noir', 'Schwarzes Loch'],
  ['像差', 'aberration', '収差', '수차', 'aberración', 'aberration', 'Aberration'],
  ['谐振', 'resonance', '共振', '공진', 'resonancia', 'résonance', 'Resonanz'],
  ['电桥', 'bridge circuit', 'ブリッジ回路', '브리지 회로', 'circuito puente', 'circuit en pont', 'Brückenschaltung'],
  ['哈希', 'hash', 'ハッシュ', '해시', 'hash', 'hachage', 'Hash'],
  ['跳表', 'skip list', 'スキップリスト', '스킵 리스트', 'lista de saltos', 'liste à saut', 'Skip-Liste'],
  ['查找', 'search', '探索', '검색', 'búsqueda', 'recherche', 'Suche'],
  ['叠加', 'superposition', '重ね合わせ', '중첩', 'superposición', 'superposition', 'Überlagerung'],
  ['噪声', 'noise', '騒音', '소음', 'ruido', 'bruit', 'Rauschen'],
  ['散射', 'scattering', '散乱', '산란', 'dispersión', 'diffusion', 'Streuung'],
  ['辐射', 'radiation', '放射', '복사', 'radiación', 'rayonnement', 'Strahlung'],
  ['循环', 'cycle', 'サイクル', '순환', 'ciclo', 'cycle', 'Zyklus'],
  ['分布', 'distribution', '分布', '분포', 'distribución', 'distribution', 'Verteilung'],
  ['方程', 'equation', '方程式', '방정식', 'ecuación', 'équation', 'Gleichung'],
  ['定律', 'law', '法則', '법칙', 'ley', 'loi', 'Gesetz'],
  ['轨道', 'orbit', '軌道', '궤도', 'órbita', 'orbite', 'Bahn'],
  ['透镜', 'lens', 'レンズ', '렌즈', 'lente', 'lentille', 'Linse'],
  ['成像', 'imaging', '結像', '결상', 'formación de imagen', 'imagerie', 'Abbildung'],
  ['回归', 'regression', '回帰', '회귀', 'regresión', 'régression', 'Regression'],
  ['索引', 'index', '索引', '색인', 'índice', 'index', 'Index'],
  ['振动', 'oscillation', '振動', '진동', 'oscilación', 'oscillation', 'Schwingung'],
  ['简谐', 'simple harmonic', '単振動の', '단순 조화', 'armónico simple', 'harmonique simple', 'einfach harmonisch'],
  ['传播', 'propagation', '伝播', '전파', 'propagación', 'propagation', 'Ausbreitung'],
  ['双源', 'double source', '二光源', '이중 광원', 'doble fuente', 'double source', 'Doppelquelle'],
  ['单缝', 'single slit', '単スリット', '단일 슬릿', 'rendija única', 'fente unique', 'Einzelspalt'],
  ['圆孔', 'circular aperture', '円孔', '원형 개구', 'abertura circular', 'ouverture circulaire', 'Kreisblende'],
  ['包络', 'envelope', '包絡線', '포락선', 'envolvente', 'enveloppe', 'Einhüllende'],
  ['一阶', 'first-order', '1次（いちじ）', '1차', 'primer orden', 'premier ordre', 'erste Ordnung'],
  ['二阶', 'second-order', '2次（にじ）', '2차', 'segundo orden', 'second ordre', 'zweite Ordnung'],
  ['腔模', 'cavity mode', '共振器モード', '공진 모드', 'modo de cavidad', 'mode de cavité', 'Hohlraummode'],
  ['显微镜', 'microscope', '顕微鏡', '현미경', 'microscopio', 'microscope', 'Mikroskop'],
  ['蛋白质', 'protein', 'タンパク質', '단백질', 'proteína', 'protéine', 'Protein'],
  ['折叠', 'folding', '折りたたみ', '접힘', 'plegamiento', 'repliement', 'Faltung'],
  ['晶体', 'crystal', '結晶', '결정', 'cristal', 'cristal', 'Kristall'],
  ['直流', 'direct current', '直流', '직류', 'corriente continua', 'courant continu', 'Gleichstrom'],
  ['电机', 'motor', 'モータ', '전동기', 'motor', 'moteur', 'Motor'],
  ['逻辑', 'logic', '論理', '논리', 'lógica', 'logique', 'Logik'],
  ['卡诺', 'Carnot', 'カルノー', '카르노', 'Carnot', 'Carnot', 'Carnot'],
  ['奥托', 'Otto', 'オットー', '오토', 'Otto', 'Otto', 'Otto'],
  ['纳什', 'Nash', 'ナッシュ', '내시', 'Nash', 'Nash', 'Nash'],
];

/** @type {Map<string, string[][]>} */
const phraseBuckets = new Map();
const phraseRows = PHRASE_TABLE
  .filter((row) => row && row[0])
  .slice()
  .sort((a, b) => b[0].length - a[0].length);
for (const row of phraseRows) {
  const ch = row[0][0];
  if (!phraseBuckets.has(ch)) phraseBuckets.set(ch, []);
  phraseBuckets.get(ch).push(row);
}

/** @type {Map<string, string[][]>} */
const buckets = new Map();
let rowsReady = null;

function rebuildBuckets(rows) {
  buckets.clear();
  for (const row of rows) {
    const zh = row[0];
    if (!zh) continue;
    const ch = zh[0];
    if (!buckets.has(ch)) buckets.set(ch, []);
    buckets.get(ch).push(row);
  }
  for (const list of buckets.values()) list.sort((a, b) => b[0].length - a[0].length);
}

/** Sync hydrate for Node tests that import ROWS directly. */
export function hydrateGlyphRows(rows) {
  rebuildBuckets(rows || []);
  rowsReady = Promise.resolve();
}

/** Load the six-language lexicon once. No-op for callers that only need Chinese. */
export function ensureGlyphRows() {
  if (buckets.size) return Promise.resolve();
  if (!rowsReady) {
    // Non-static specifier keeps glyphRows out of the lab.js bundle.
    const href = typeof document !== 'undefined'
      ? new URL('js/i18n/glyphRows.js', document.baseURI).href
      : new URL('./glyphRows.js', import.meta.url).href;
    rowsReady = import(href).then((mod) => {
      rebuildBuckets(mod.ROWS || []);
    }).catch((err) => {
      console.warn('glyphRows load failed', err);
      rowsReady = null;
      rebuildBuckets([]);
    });
  }
  return rowsReady || Promise.resolve();
}

export function glyphRowsReady() {
  return buckets.size > 0;
}

export function translateCatalogText(locale, text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw || locale === 'zh' || IDX[locale] == null) return raw;
  const idx = IDX[locale] + 1;
  let out = '';
  for (let i = 0; i < raw.length;) {
    const phrases = phraseBuckets.get(raw[i]);
    let hit = null;
    if (phrases) {
      for (const row of phrases) {
        if (raw.startsWith(row[0], i) && row[idx]) {
          hit = row;
          break;
        }
      }
    }
    if (!hit && buckets.size) {
      const list = buckets.get(raw[i]);
      if (list) {
        for (const row of list) {
          if (raw.startsWith(row[0], i) && row[idx]) {
            hit = row;
            break;
          }
        }
      }
    }
    if (hit) {
      const piece = String(hit[idx] || '');
      if (
        locale !== 'ja'
        && out
        && /[A-Za-z0-9)]$/.test(out)
        && /^[A-Za-z0-9(]/.test(piece)
      ) {
        out += ' ';
      }
      out += piece;
      i += hit[0].length;
    } else {
      const punct = PUNCT[locale]?.[raw[i]];
      out += punct != null ? punct : raw[i];
      i += 1;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Phrase table only. Returns null when any Han character is left unmatched,
 * so a regen cannot fall through to single-character gloss.
 */
export function translatePhrasesOnly(locale, text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw || locale === 'zh' || IDX[locale] == null) return raw || null;
  const idx = IDX[locale] + 1;
  let out = '';
  for (let i = 0; i < raw.length;) {
    const phrases = phraseBuckets.get(raw[i]);
    let hit = null;
    if (phrases) {
      for (const row of phrases) {
        if (raw.startsWith(row[0], i) && row[idx]) {
          hit = row;
          break;
        }
      }
    }
    if (hit) {
      const piece = String(hit[idx] || '');
      if (
        locale !== 'ja'
        && out
        && /[A-Za-z0-9)]$/.test(out)
        && /^[A-Za-z0-9(]/.test(piece)
      ) {
        out += ' ';
      }
      out += piece;
      i += hit[0].length;
      continue;
    }
    const ch = raw[i];
    if (/[\u4e00-\u9fff]/.test(ch)) return null;
    const punct = PUNCT[locale]?.[ch];
    out += punct != null ? punct : ch;
    i += 1;
  }
  const cleaned = out.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}
