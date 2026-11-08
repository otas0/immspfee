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
  ['水轮机（佩尔顿/弗朗西斯）', 'Pelton/Francis turbine', 'ペルトン/フランシス水車', '펠턴/프랜시스 수차', 'turbina Pelton/Francis', 'turbine Pelton/Francis', 'Pelton-/Francis-Turbine'],
  ['细胞自动机/生命游戏', 'cellular automaton / Game of Life', 'セルオートマトン／ライフゲーム', '세포 자동자 / 생명 게임', 'autómata celular / Juego de la vida', 'automate cellulaire / jeu de la vie', 'Zellulärer Automat / Game of Life'],
  ['指令周期/汇编执行', 'instruction cycle / assembly execution', '命令サイクル／アセンブリ実行', '명령 주기 / 어셈블리 실행', 'ciclo de instrucción / ejecución ensamblador', 'cycle d’instruction / exécution assembleur', 'Befehlszyklus / Assembler-Ausführung'],
  ['调粘度、重力、粒子数', 'tune viscosity, gravity, particle count', '粘度・重力・粒子数を調整', '점도·중력·입자 수 조절', 'ajustar viscosidad, gravedad, número de partículas', 'régler viscosité, gravité, nombre de particules', 'Viskosität, Schwerkraft, Teilchenzahl einstellen'],
  ['调频率、绳长、张力', 'tune frequency, length, tension', '周波数・長さ・張力を調整', '주파수·길이·장력 조절', 'ajustar frecuencia, longitud, tensión', 'régler fréquence, longueur, tension', 'Frequenz, Länge, Spannung einstellen'],
  ['调缝距、波长、屏距', 'tune slit spacing, wavelength, screen distance', 'スリット間隔・波長・スクリーン距離を調整', '슬릿 간격·파장·스크린 거리 조절', 'ajustar separación, longitud de onda, distancia', 'régler écartement, longueur d’onde, distance', 'Spaltabstand, Wellenlänge, Schirmabstand einstellen'],
  ['调物距、焦距、物高', 'tune object distance, focal length, object height', '物体距離・焦点距離・物体高さを調整', '물체거리·초점거리·물체높이 조절', 'ajustar distancia al objeto, focal, altura', 'régler distance objet, focale, hauteur', 'Gegenstandsweite, Brennweite, Gegenstandshöhe einstellen'],
  ['调张力、密度、激励点', 'tune tension, density, drive point', '張力・密度・励振点を調整', '장력·밀도·가진점 조절', 'ajustar tensión, densidad, punto de excitación', 'régler tension, densité, point d’excitation', 'Spannung, Dichte, Anregungspunkt einstellen'],
  ['粒子、颜色映射、交互扰动', 'particles, colormap, interactive perturbation', '粒子・カラーマップ・相互作用', '입자, 컬러맵, 상호작용 섭동', 'partículas, mapa de color, perturbación', 'particules, carte de couleurs, perturbation', 'Teilchen, Farbkarte, Störung'],
  ['绳上驻波、节点/腹点', 'standing wave on a string; nodes/antinodes', '弦の定常波・節／腹', '현의 정상파·마디/배', 'onda estacionaria; nodos/antinodos', 'onde stationnaire; nœuds/ventres', 'stehende Welle; Knoten/Bäuche'],
  ['光轴、物/像、三条特殊光线', 'optical axis; object/image; three principal rays', '光軸・物／像・3本の主光線', '광축·물/상·세 주요 광선', 'eje óptico; objeto/imagen; tres rayos', 'axe optique; objet/image; trois rayons', 'optische Achse; Gegenstand/Bild; drei Hauptstrahlen'],
  ['双缝、屏幕条纹', 'double slit; screen fringes', '二重スリット・スクリーン縞', '이중 슬릿·스크린 무늬', 'doble rendija; franjas', 'double fente; franges', 'Doppelspalt; Schirmstreifen'],
  ['网格、颜色映射、模态', 'grid, colormap, modes', '格子・カラーマップ・モード', '격자, 컬러맵, 모드', 'malla, mapa de color, modos', 'grille, carte de couleurs, modes', 'Gitter, Farbkarte, Moden'],
  ['竖直一维、常 g、线性阻力 F=−kv；不计浮力与二次阻力', 'vertical 1D, constant g, linear drag F=−kv; neglect buoyancy and quadratic drag', '鉛直1次元・一定g・線形抵抗F=−kv；浮力と二次抵抗は無視', '연직 1차원·상수 g·선형 저항 F=−kv; 부력·이차 저항 무시', '1D vertical, g constante, F=−kv; sin flotación ni arrastre cuadrático', '1D vertical, g constant, F=−kv ; sans flottabilité ni traînée quadratique', 'vertikal 1D, konstantes g, F=−kv; ohne Auftrieb und quadratischen Widerstand'],
  ['匀 g、无空气阻力（公式层）；平面运动；落地停止按模型选项', 'uniform g, no air drag (formula layer); planar motion; ground stop per model options', '一定g・空気抵抗なし（公式層）；平面運動；着地停止はモデル設定による', '일정 g·공기저항 없음(공식층); 평면 운동; 착지 정지는 모델 옵션', 'g uniforme, sin resistencia (capa fórmula); movimiento plano; parada según opciones', 'g uniforme, sans traînée (couche formule) ; mouvement plan ; arrêt selon options', 'konstantes g, ohne Luftwiderstand (Formelschicht); ebene Bewegung; Stopp je nach Option'],
  ['刚性斜面、库仑摩擦、质点；a=g(sinθ−μcosθ) 在下滑方向', 'rigid incline, Coulomb friction, point mass; a=g(sinθ−μcosθ) downslope', '剛な斜面・クーロン摩擦・質点；下り方向 a=g(sinθ−μcosθ)', '강체 빗면·쿨롱 마찰·질점; 내리막 a=g(sinθ−μcosθ)', 'plano rígido, fricción de Coulomb, masa puntual; a=g(sinθ−μcosθ) cuesta abajo', 'plan rigide, frottement de Coulomb, masse ponctuelle ; a=g(sinθ−μcosθ) vers le bas', 'starre Ebene, Coulomb-Reibung, Punktmasse; a=g(sinθ−μcosθ) hangabwärts'],
  ['库仑摩擦', 'Coulomb friction', 'クーロン摩擦', '쿨롱 마찰', 'fricción de Coulomb', 'frottement de Coulomb', 'Coulomb-Reibung'],
  ['线性阻力', 'linear drag', '線形抵抗', '선형 저항', 'arrastre lineal', 'traînée linéaire', 'linearer Widerstand'],
  ['二次阻力', 'quadratic drag', '二次抵抗', '이차 저항', 'arrastre cuadrático', 'traînée quadratique', 'quadratischer Widerstand'],
  ['平面运动', 'planar motion', '平面運動', '평면 운동', 'movimiento plano', 'mouvement plan', 'ebene Bewegung'],
  ['质点', 'point mass', '質点', '질점', 'masa puntual', 'masse ponctuelle', 'Punktmasse'],
  ['斜面滑动物块', 'block sliding on an incline', '斜面上を滑る物体', '빗면에서 미끄러지는 물체', 'bloque que desliza en un plano', 'bloc glissant sur un plan', 'Block auf schiefer Ebene'],
  ['小球、地面、速度矢量', 'ball, ground, velocity vector', '小球・地面・速度ベクトル', '작은 공, 지면, 속도 벡터', 'bola, suelo, vector velocidad', 'bille, sol, vecteur vitesse', 'Kugel, Boden, Geschwindigkeitsvektor'],
  ['调 g、初高度、空气阻力', 'tune g, initial height, air drag', 'g・初期高さ・空気抵抗を調整', 'g·초기 높이·공기저항 조절', 'ajustar g, altura inicial, resistencia', 'régler g, hauteur initiale, traînée', 'g, Anfangshöhe, Luftwiderstand einstellen'],
  ['弹簧、质量块、平衡位置', 'spring, mass, equilibrium', 'ばね・質量・平衡位置', '스프링, 질량, 평형 위치', 'resorte, masa, equilibrio', 'ressort, masse, équilibre', 'Feder, Masse, Gleichgewichtslage'],
  ['调 m、k、阻尼、x0', 'tune m, k, damping, x0', 'm・k・減衰・x0 を調整', 'm·k·감쇠·x0 조절', 'ajustar m, k, amortiguación, x0', 'régler m, k, amortissement, x0', 'm, k, Dämpfung, x0 einstellen'],
  ['斜面、物块、受力分解', 'incline, block, force resolution', '斜面・物体・力の分解', '빗면, 물체, 힘 분해', 'plano, bloque, descomposición de fuerzas', 'plan, bloc, décomposition des forces', 'Ebene, Block, Kräftezerlegung'],
  ['调斜面角、摩擦系数、质量', 'tune angle, friction coefficient, mass', '斜面角・摩擦係数・質量を調整', '빗면각·마찰계수·질량 조절', 'ajustar ángulo, fricción, masa', 'régler angle, frottement, masse', 'Winkel, Reibung, Masse einstellen'],
  ['竖直一维、常 g、线性阻力', 'vertical 1D, constant g, linear drag', '鉛直1次元・一定g・線形抵抗', '연직 1차원·상수 g·선형 저항', '1D vertical, g constante, arrastre lineal', '1D vertical, g constant, traînée linéaire', 'vertikal 1D, konstantes g, linearer Widerstand'],
  ['不计浮力与二次阻力', 'neglect buoyancy and quadratic drag', '浮力と二次抵抗を無視', '부력과 이차 저항 무시', 'sin flotación ni arrastre cuadrático', 'sans flottabilité ni traînée quadratique', 'ohne Auftrieb und quadratischen Widerstand'],
  ['空气阻力', 'air drag', '空気抵抗', '공기저항', 'resistencia del aire', 'résistance de l’air', 'Luftwiderstand'],
  ['速度矢量', 'velocity vector', '速度ベクトル', '속도 벡터', 'vector velocidad', 'vecteur vitesse', 'Geschwindigkeitsvektor'],
  ['受力分解', 'force resolution', '力の分解', '힘 분해', 'descomposición de fuerzas', 'décomposition des forces', 'Kräftezerlegung'],
  ['摩擦系数', 'friction coefficient', '摩擦係数', '마찰계수', 'coeficiente de fricción', 'coefficient de frottement', 'Reibungskoeffizient'],
  ['初高度', 'initial height', '初期高さ', '초기 높이', 'altura inicial', 'hauteur initiale', 'Anfangshöhe'],
  ['平衡位置', 'equilibrium position', '平衡位置', '평형 위치', 'posición de equilibrio', 'position d’équilibre', 'Gleichgewichtslage'],
  ['质量块', 'mass block', '質量', '질량 블록', 'bloque de masa', 'masse', 'Masse'],
  ['参数见工作台', 'parameters on the workbench', 'パラメータは作業台を参照', '매개변수는 작업대 참고', 'parámetros en el banco', 'paramètres sur le banc', 'Parameter am Arbeitstisch'],
  ['教学可视化', 'teaching visualization', '教育用可視化', '교육용 시각화', 'visualización didáctica', 'visualisation pédagogique', 'Lehrvisualisierung'],
  ['算法与数据结构', 'algorithms and data structures', 'アルゴリズムとデータ構造', '알고리즘과 자료구조', 'algoritmos y estructuras de datos', 'algorithmes et structures de données', 'Algorithmen und Datenstrukturen'],
  ['计算机科学', 'computer science', 'コンピュータ科学', '컴퓨터 과학', 'ciencias de la computación', 'informatique', 'Informatik'],
  ['计算机工程', 'computer engineering', 'コンピュータ工学', '컴퓨터 공학', 'ingeniería informática', 'génie informatique', 'Technische Informatik'],
  ['数字逻辑', 'digital logic', 'ディジタル論理', '디지털 논리', 'lógica digital', 'logique numérique', 'Digitallogik'],
  ['操作系统', 'operating systems', 'オペレーティングシステム', '운영체제', 'sistemas operativos', 'systèmes d’exploitation', 'Betriebssysteme'],
  ['机器学习', 'machine learning', '機械学習', '기계 학습', 'aprendizaje automático', 'apprentissage automatique', 'maschinelles Lernen'],
  ['强化学习', 'reinforcement learning', '強化学習', '강화학습', 'aprendizaje por refuerzo', 'apprentissage par renforcement', 'Bestärkendes Lernen'],
  ['神经网络', 'neural network', 'ニューラルネットワーク', '신경망', 'red neuronal', 'réseau de neurones', 'neuronales Netz'],
  ['动态规划', 'dynamic programming', '動的計画法', '동적 계획법', 'programación dinámica', 'programmation dynamique', 'dynamische Programmierung'],
  ['信息论', 'information theory', '情報理論', '정보이론', 'teoría de la información', 'théorie de l’information', 'Informationstheorie'],
  ['密码学', 'cryptography', '暗号', '암호학', 'criptografía', 'cryptographie', 'Kryptographie'],
  ['网络协议', 'network protocol', 'ネットワークプロトコル', '네트워크 프로토콜', 'protocolo de red', 'protocole réseau', 'Netzwerkprotokoll'],
  ['存储层次', 'memory hierarchy', '記憶階層', '메모리 계층', 'jerarquía de memoria', 'hiérarchie mémoire', 'Speicherhierarchie'],
  ['复合材料', 'composite materials', '複合材料', '복합재료', 'materiales compuestos', 'matériaux composites', 'Verbundwerkstoffe'],
  ['近代物理', 'modern physics', '現代物理', '현대 물리', 'física moderna', 'physique moderne', 'moderne Physik'],
  ['地球物理', 'geophysics', '地球物理学', '지구물리학', 'geofísica', 'géophysique', 'Geophysik'],
  ['等离子体', 'plasma', 'プラズマ', '플라스마', 'plasma', 'plasma', 'Plasma'],
  ['计算理论', 'theory of computation', '計算理論', '계산 이론', 'teoría de la computación', 'théorie de la calculabilité', 'Berechenbarkeitstheorie'],
  ['杆件拉伸/压缩', 'axial tension/compression', '棒の引張／圧縮', '축 인장/압축', 'tracción/compresión axial', 'traction/compression axiale', 'Zug/Druck im Stab'],
  ['抛体运动', 'projectile motion', '放物運動', '포물선 운동', 'movimiento de proyectil', 'mouvement de projectile', 'Wurfbewegung'],
  ['杆件拉伸', 'axial tension', '棒の引張', '축 인장', 'tracción axial', 'traction axiale', 'Zug im Stab'],
  ['引力弹弓', 'gravitational slingshot', '重力スイングバイ', '중력 슬링샷', 'asistencia gravitatoria', 'assistance gravitationnelle', 'Swing-by'],
  ['总线/仲裁', 'bus / arbitration', 'バス／調停', '버스 / 중재', 'bus / arbitraje', 'bus / arbitrage', 'Bus / Arbitration'],
  ['颜色映射', 'colormap', 'カラーマップ', '컬러맵', 'mapa de color', 'carte de couleurs', 'Farbkarte'],
  ['交互扰动', 'interactive perturbation', '相互作用による摂動', '상호작용 섭동', 'perturbación interactiva', 'perturbation interactive', 'interaktive Störung'],
  ['佩尔顿', 'Pelton', 'ペルトン', '펠턴', 'Pelton', 'Pelton', 'Pelton'],
  ['弗朗西斯', 'Francis', 'フランシス', '프랜시스', 'Francis', 'Francis', 'Francis'],
  ['水轮机', 'water turbine', '水車', '수차', 'turbina hidráulica', 'turbine hydraulique', 'Wasserturbine'],
  ['细胞自动机', 'cellular automaton', 'セルオートマトン', '세포 자동자', 'autómata celular', 'automate cellulaire', 'Zellulärer Automat'],
  ['生命游戏', 'Game of Life', 'ライフゲーム', '생명 게임', 'Juego de la vida', 'jeu de la vie', 'Game of Life'],
  ['指令周期', 'instruction cycle', '命令サイクル', '명령 주기', 'ciclo de instrucción', 'cycle d’instruction', 'Befehlszyklus'],
  ['汇编执行', 'assembly execution', 'アセンブリ実行', '어셈블리 실행', 'ejecución ensamblador', 'exécution assembleur', 'Assembler-Ausführung'],
  ['特殊光线', 'principal rays', '主光線', '주요 광선', 'rayos principales', 'rayons principaux', 'Hauptstrahlen'],
  ['屏幕条纹', 'screen fringes', 'スクリーン縞', '스크린 무늬', 'franjas en pantalla', 'franges d’écran', 'Schirmstreifen'],
  ['驻波', 'standing wave', '定常波', '정상파', 'onda estacionaria', 'onde stationnaire', 'stehende Welle'],
  ['腹点', 'antinode', '腹', '배', 'antinodo', 'ventre', 'Bauch'],
  ['节点', 'node', '節', '마디', 'nodo', 'nœud', 'Knoten'],
  ['仲裁', 'arbitration', '調停', '중재', 'arbitraje', 'arbitrage', 'Arbitration'],
  ['总线', 'bus', 'バス', '버스', 'bus', 'bus', 'Bus'],
  ['弹弓', 'slingshot', 'スイングバイ', '슬링샷', 'honda', 'fronde', 'Schleuder'],
  ['粘度', 'viscosity', '粘度', '점도', 'viscosidad', 'viscosité', 'Viskosität'],
  ['粒子数', 'particle count', '粒子数', '입자 수', 'número de partículas', 'nombre de particules', 'Teilchenzahl'],
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
  ['液滴撞击', 'droplet impact', '液滴衝突', '액적 충돌', 'impacto de gota', 'impact de goutte', 'Tropfenaufprall'],
  ['CP破坏', 'CP violation', 'CP対称性の破れ', 'CP 위반', 'violación CP', 'violation de CP', 'CP-Verletzung'],
  ['晶体结构', 'crystal structure', '結晶構造', '결정 구조', 'estructura cristalina', 'structure cristalline', 'Kristallstruktur'],
  ['晶体缺陷', 'crystal defect', '結晶欠陥', '결정 결함', 'defecto cristalino', 'défaut cristallin', 'Kristalldefekt'],
  ['分子动力学', 'molecular dynamics', '分子動力学', '분자동역학', 'dinámica molecular', 'dynamique moléculaire', 'Molekulardynamik'],
  ['神经动作电位', 'neuronal action potential', '神経活動電位', '신경 활동전위', 'potencial de acción neuronal', "potentiel d'action neuronal", 'neuronales Aktionspotential'],
  ['神经放电', 'neuronal firing', '神経発火', '신경 발화', 'disparo neuronal', 'décharge neuronale', 'neuronale Entladung'],
  ['DNA拉伸', 'DNA stretching', 'DNA伸長', 'DNA 신장', 'estiramiento de ADN', "étirement de l'ADN", 'DNA-Dehnung'],
  ['后缀数组', 'suffix array', '接尾辞配列', '접미사 배열', 'arreglo de sufijos', 'tableau de suffixes', 'Suffixarray'],
  ['后缀树', 'suffix tree', '接尾辞木', '접미사 트리', 'árbol de sufijos', 'arbre de suffixes', 'Suffixbaum'],
  ['零知识', 'zero-knowledge', 'ゼロ知識', '영지식', 'conocimiento cero', 'connaissance nulle', 'Zero-Knowledge'],
  ['策略梯度', 'policy gradient', '方策勾配', '정책 경사', 'gradiente de política', 'gradient de politique', 'Policy-Gradient'],
  ['共轭梯度', 'conjugate gradient', '共役勾配法', '켤레기울기법', 'gradiente conjugado', 'gradient conjugué', 'konjugierte Gradienten'],
  ['生产者消费者', 'producer–consumer', '生産者・消費者', '생산자-소비자', 'productor–consumidor', 'producteur–consommateur', 'Erzeuger–Verbraucher'],
  ['页置换', 'page replacement', 'ページ置換', '페이지 교체', 'reemplazo de páginas', 'remplacement de pages', 'Seitenersetzung'],
  ['逻辑化简', 'logic minimization', '論理簡単化', '논리 간소화', 'minimización lógica', 'minimisation logique', 'Logikminimierung'],
  ['数据通路', 'datapath', 'データパス', '데이터 경로', 'ruta de datos', 'chemin de données', 'Datenpfad'],
  ['内存一致性', 'memory consistency', 'メモリ一貫性', '메모리 일관성', 'coherencia de memoria', 'cohérence mémoire', 'Speicherkonsistenz'],
  ['组合逻辑门', 'combinational logic gate', '組み合わせ論理ゲート', '조합 논리 게이트', 'puerta lógica combinacional', 'porte logique combinatoire', 'kombinatorisches Logikgatter'],
  ['可配置逻辑块', 'configurable logic block', '構成可能論理ブロック', '구성 가능 논리 블록', 'bloque lógico configurable', 'bloc logique configurable', 'konfigurierbarer Logikblock'],
  ['自适应滤波', 'adaptive filtering', '適応フィルタ', '적응 필터', 'filtrado adaptativo', 'filtrage adaptatif', 'adaptive Filterung'],
  ['压缩感知', 'compressed sensing', '圧縮センシング', '압축 센싱', 'sensado comprimido', 'acquisition comprimée', 'komprimierte Abtastung'],
  ['感应电机', 'induction motor', '誘導電動機', '유도 전동기', 'motor de inducción', 'moteur à induction', 'Induktionsmotor'],
  ['同步电机', 'synchronous motor', '同期電動機', '동기 전동기', 'motor síncrono', 'moteur synchrone', 'Synchronmotor'],
  ['异步电机', 'asynchronous motor', '非同期電動機', '비동기 전동기', 'motor asíncrono', 'moteur asynchrone', 'Asynchronmotor'],
  ['功率因数', 'power factor', '力率', '역률', 'factor de potencia', 'facteur de puissance', 'Leistungsfaktor'],
  ['损伤力学', 'damage mechanics', '損傷力学', '손상 역학', 'mecánica del daño', "mécanique de l'endommagement", 'Schädigungsmechanik'],
  ['冲击损伤', 'impact damage', '衝撃損傷', '충격 손상', 'daño por impacto', 'endommagement par impact', 'Schlagschaden'],
  ['挡土墙', 'retaining wall', '擁壁', '옹벽', 'muro de contención', 'mur de soutènement', 'Stützmauer'],
  ['车辆荷载', 'vehicle load', '車両荷重', '차량 하중', 'carga de vehículos', 'charge de véhicules', 'Fahrzeuglast'],
  ['风致振动', 'wind-induced vibration', '風による振動', '풍유발 진동', 'vibración inducida por el viento', 'vibration induite par le vent', 'windinduzierte Schwingung'],
  ['跟驰模型', 'car-following model', '追従モデル', '차량 추종 모형', 'modelo de seguimiento', 'modèle de poursuite', 'Fahrzeugfolgemodell'],
  ['滴流床', 'trickle-bed reactor', 'トリクルベッド', '트리클 베드', 'lecho de goteo', 'lit ruisselant', 'Rieselbetreaktor'],
  ['起搏器', 'pacemaker', 'ペースメーカー', '심박조율기', 'marcapasos', 'stimulateur cardiaque', 'Herzschrittmacher'],
  ['呼吸力学', 'respiratory mechanics', '呼吸力学', '호흡 역학', 'mecánica respiratoria', 'mécanique respiratoire', 'Atemmechanik'],
  ['药代动力学', 'pharmacokinetics', '薬物動態', '약동학', 'farmacocinética', 'pharmacocinétique', 'Pharmakokinetik'],
  ['医学成像', 'medical imaging', '医用画像', '의학 영상', 'imagen médica', 'imagerie médicale', 'medizinische Bildgebung'],
  ['无功补偿', 'reactive-power compensation', '無効電力補償', '무효전력 보상', 'compensación de potencia reactiva', 'compensation de puissance réactive', 'Blindleistungskompensation'],
  ['汽车悬架', 'vehicle suspension', '自動車サスペンション', '자동차 현가장치', 'suspensión de automóvil', 'suspension automobile', 'Fahrzeugfederung'],
  ['假设检验', 'hypothesis test', '仮説検定', '가설 검정', 'contraste de hipótesis', "test d'hypothèse", 'Hypothesentest'],
  ['酸碱滴定', 'acid–base titration', '酸塩基滴定', '산염기 적정', 'valoración ácido-base', 'titrage acido-basique', 'Säure-Base-Titration'],
  ['解释器', 'interpreter', 'インタプリタ', '인터프리터', 'intérprete', 'interpréteur', 'Interpreter'],
  ['归并', 'merge sort', 'マージソート', '병합 정렬', 'ordenación por mezcla', 'tri par fusion', 'Mergesort'],
  ['归约', 'reduction', '帰着', '환원', 'reducción', 'réduction', 'Reduktion'],
  ['滤波', 'filtering', 'フィルタリング', '필터링', 'filtrado', 'filtrage', 'Filterung'],
  ['整流', 'rectification', '整流', '정류', 'rectificación', 'redressement', 'Gleichrichtung'],
  ['斩波', 'chopper', 'チョッパ', '초퍼', 'troceador', 'hacheur', 'Gleichstromsteller'],
  ['拉伸', 'uniaxial tension', '引張', '인장', 'tracción', 'traction', 'Zugversuch'],
  ['桁架', 'truss', 'トラス', '트러스', 'celosía', 'treillis', 'Fachwerk'],
  ['框架', 'structural frame', 'ラーメン', '골조', 'pórtico', 'portique', 'Rahmen'],
  ['功耗', 'power consumption', '消費電力', '소비 전력', 'consumo de potencia', 'consommation', 'Leistungsaufnahme'],
  ['发电机', 'electric generator', '発電機', '발전기', 'generador eléctrico', 'générateur électrique', 'Generator'],
  ['电镀', 'electroplating', '電気めっき', '전기도금', 'electrodeposición', 'électrodéposition', 'Galvanisieren'],
  ['膨胀', 'expansion', '膨張', '팽창', 'expansión', 'expansion', 'Expansion'],
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
