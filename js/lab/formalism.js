/**
 * 分类与统一接口（对齐 scikit-complexity 思路，Web/Canvas 重实现）：
 * - catalog 按 domain/sub/family 浏览
 * - 同一套 Model API：init / step / draw / getReadouts / refresh
 * - 可视化层只用 Canvas，不依赖 Python/Rerun
 * - 工程族：原理性方程，非工业求解器
 * - CS 族：借鉴 Algorithm Visualizer 步进/高亮思路
 * - 物理族：借鉴 PhET / oPhysics 拖拽与读数对照
 */

/** family → 形式 / 交互原型 */
export const FAMILY_META = {
  ode1d: { formalism: 'ode', viz: 'phet-particle', hint: '拖参看运动；dyn 即时生效（类 PhET）' },
  ode2d: { formalism: 'ode', viz: 'phet-particle', hint: '二维轨迹；改初值会重置' },
  circular: { formalism: 'ode', viz: 'phet-orbit', hint: '圆周/开普勒示意；非 N 体工业精度' },
  particles: { formalism: 'agents', viz: 'phet-field', hint: '粒子示意；参数改场强/电荷' },
  nbody: { formalism: 'ode', viz: 'phet-orbit', hint: '少体引力示意；软化防奇点' },
  euler: { formalism: 'ode', viz: 'gauge', hint: '姿态/欧拉角原理演示' },
  buoyancy: { formalism: 'ode', viz: 'phet-fluid', hint: '浮力平衡示意' },
  flow: { formalism: 'field', viz: 'stream', hint: '流线/流量原理图，非 CFD' },
  wave1d: { formalism: 'pde', viz: 'wave', hint: '一维波动有限差分示意' },
  doppler: { formalism: 'wave', viz: 'wave', hint: '多普勒频移示意' },
  interference: { formalism: 'wave', viz: 'wave', hint: '双源干涉条纹示意' },
  field2d: { formalism: 'field', viz: 'field', hint: '二维场矢量/等值示意' },
  piston: { formalism: 'thermo', viz: 'gauge', hint: '活塞过程示意' },
  cycle: { formalism: 'thermo', viz: 'cycle', hint: '热力循环 P–V 原理图' },
  fieldlines: { formalism: 'field', viz: 'field', hint: '电场线示意' },
  circuit: { formalism: 'circuit', viz: 'circuit', hint: '集总电路示意（RC/RL）；非 SPICE' },
  induction: { formalism: 'em', viz: 'phet-field', hint: '感应电动势示意' },
  rays: { formalism: 'optics', viz: 'phet-optics', hint: '几何光学：拖物距；虚像虚线（类 oPhysics）' },
  gauge: { formalism: 'gauge', viz: 'gauge', hint: '读数量表 + 简化动态' },
  variant: { formalism: 'gauge', viz: 'gauge', hint: '族×维度变体：旋钮映射 dims，示意动态' },
  bohr: { formalism: 'quantum', viz: 'gauge', hint: '能级跃迁示意' },
  decay: { formalism: 'stochastic', viz: 'gauge', hint: '衰变曲线示意' },
  discrete: { formalism: 'map', viz: 'algo-step', hint: '离散迭代；步进高亮（类 Algorithm Visualizer）' },
  graph: { formalism: 'network', viz: 'algo-graph', hint: '图算法：点选/连边；逐步松弛' },
  tree: { formalism: 'network', viz: 'algo-tree', hint: '树/分层结构步进' },
  fsm: { formalism: 'discrete', viz: 'algo-step', hint: '状态机高亮当前态' },
  turing: { formalism: 'discrete', viz: 'algo-step', hint: '纸带读写示意' },
  crypto: { formalism: 'discrete', viz: 'algo-step', hint: '加密步骤可视化' },
  ml: { formalism: 'learning', viz: 'algo-step', hint: '损失/权重示意训练步' },
  opt: { formalism: 'opt', viz: 'algo-step', hint: '优化轨迹示意' },
  logic: { formalism: 'digital', viz: 'netlist', hint: '逻辑门/网表拖线（类数字实验台）' },
  arch: { formalism: 'digital', viz: 'algo-step', hint: '流水线/缓存命中示意' },
  embed: { formalism: 'digital', viz: 'gauge', hint: '嵌入式时序示意' },
  comm: { formalism: 'signal', viz: 'wave', hint: '调制/误码示意' },
  net: { formalism: 'network', viz: 'algo-graph', hint: '网络协议步进' },
  os: { formalism: 'discrete', viz: 'algo-step', hint: '调度/队列示意' },
  compile: { formalism: 'discrete', viz: 'algo-tree', hint: '编译管线阶段高亮' },
  dist: { formalism: 'network', viz: 'algo-graph', hint: '分布式共识示意' },
  struct: { formalism: 'ode', viz: 'beam', hint: '梁/桁架内力示意；非 FEA' },
  control: { formalism: 'ode', viz: 'control', hint: 'PID/根轨迹原理图，非工业调参软件' },
  chaos: { formalism: 'ode', viz: 'phase', hint: '相空间示意' },
  traffic: { formalism: 'agents', viz: 'traffic', hint: '元胞交通流示意' },
  reactor: { formalism: 'ode', viz: 'gauge', hint: '反应堆点堆示意' },
  aero: { formalism: 'ode', viz: 'aero', hint: '气动/姿态简化方程' },
};

export function familyCapabilities(family, spec = {}) {
  const meta = FAMILY_META[family] || FAMILY_META.gauge;
  const base = {
    formalism: meta.formalism,
    viz: meta.viz,
    interaction: meta.viz.includes('algo') || meta.viz === 'netlist' || meta.viz === 'phet-optics'
      ? (meta.viz === 'phet-optics' || meta.viz === 'algo-graph' || meta.viz === 'netlist' ? 'canvas' : 'knobs')
      : 'knobs',
    hint: meta.hint,
    fidelity: 'principle', // 工程/物理均默认原理级
  };
  if (spec.id === 'lens') {
    return {
      ...base,
      pointer: true,
      interaction: 'canvas',
      hint: '拖动物体调 u/h；虚像虚线 + 像距刻度（类 oPhysics 透镜）',
    };
  }
  if (family === 'graph' || family === 'logic') {
    return { ...base, pointer: true, interaction: 'canvas' };
  }
  return base;
}
