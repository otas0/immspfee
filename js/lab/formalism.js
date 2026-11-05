/**
 * Catalog family → formalism / interaction prototype (Canvas visualization).
 * hints are short interaction cues only — never fidelity / disclaimer copy.
 */

/** family → form / interaction prototype */
export const FAMILY_META = {
  ode1d: { formalism: 'ode', viz: 'phet-particle', hint: 'Tune dynamics live' },
  ode2d: { formalism: 'ode', viz: 'phet-particle', hint: '2D trail; reinit on IC change' },
  circular: { formalism: 'ode', viz: 'phet-orbit', hint: 'Circular / Kepler motion' },
  particles: { formalism: 'agents', viz: 'phet-field', hint: 'Tune field / charge' },
  nbody: { formalism: 'ode', viz: 'phet-orbit', hint: 'Few-body gravity' },
  euler: { formalism: 'ode', viz: 'gauge', hint: 'Attitude / Euler angles' },
  buoyancy: { formalism: 'ode', viz: 'phet-fluid', hint: 'Buoyancy balance' },
  flow: { formalism: 'field', viz: 'stream', hint: 'Streamlines' },
  wave1d: { formalism: 'pde', viz: 'wave', hint: '1D wave FD' },
  doppler: { formalism: 'wave', viz: 'wave', hint: 'Doppler shift' },
  interference: { formalism: 'wave', viz: 'wave', hint: 'Two-source interference' },
  field2d: { formalism: 'field', viz: 'field', hint: '2D field vectors' },
  piston: { formalism: 'thermo', viz: 'gauge', hint: 'Piston process' },
  cycle: { formalism: 'thermo', viz: 'cycle', hint: 'P–V cycle' },
  fieldlines: { formalism: 'field', viz: 'field', hint: 'Field lines' },
  circuit: { formalism: 'circuit', viz: 'circuit', hint: 'Lumped RC/RL' },
  induction: { formalism: 'em', viz: 'phet-field', hint: 'Induced EMF' },
  rays: { formalism: 'optics', viz: 'phet-optics', hint: 'Drag object distance' },
  gauge: { formalism: 'gauge', viz: 'gauge', hint: 'Gauge + light dynamics' },
  variant: { formalism: 'gauge', viz: 'gauge', hint: 'Family × dim knobs' },
  bohr: { formalism: 'quantum', viz: 'gauge', hint: 'Level transitions' },
  decay: { formalism: 'stochastic', viz: 'gauge', hint: 'Decay curve' },
  discrete: { formalism: 'map', viz: 'algo-step', hint: 'Step discrete map' },
  graph: { formalism: 'network', viz: 'algo-graph', hint: 'Pick nodes / edges' },
  tree: { formalism: 'network', viz: 'algo-tree', hint: 'Tree step-through' },
  fsm: { formalism: 'discrete', viz: 'algo-step', hint: 'Highlight FSM state' },
  turing: { formalism: 'discrete', viz: 'algo-step', hint: 'Tape R/W' },
  crypto: { formalism: 'discrete', viz: 'algo-step', hint: 'Crypto steps' },
  ml: { formalism: 'learning', viz: 'algo-step', hint: 'Train step' },
  opt: { formalism: 'opt', viz: 'algo-step', hint: 'Optimizer path' },
  logic: { formalism: 'digital', viz: 'netlist', hint: 'Wire logic netlist' },
  arch: { formalism: 'digital', viz: 'algo-step', hint: 'Pipeline / cache' },
  embed: { formalism: 'digital', viz: 'gauge', hint: 'Embedded timing' },
  comm: { formalism: 'signal', viz: 'wave', hint: 'Modulation / BER' },
  net: { formalism: 'network', viz: 'algo-graph', hint: 'Protocol steps' },
  os: { formalism: 'discrete', viz: 'algo-step', hint: 'Scheduler / queue' },
  compile: { formalism: 'discrete', viz: 'algo-tree', hint: 'Compile stages' },
  dist: { formalism: 'network', viz: 'algo-graph', hint: 'Consensus steps' },
  struct: { formalism: 'ode', viz: 'beam', hint: 'Beam / truss forces' },
  control: { formalism: 'ode', viz: 'control', hint: 'PID / root locus' },
  chaos: { formalism: 'ode', viz: 'phase', hint: 'Phase space' },
  traffic: { formalism: 'agents', viz: 'traffic', hint: 'Cellular traffic' },
  reactor: { formalism: 'ode', viz: 'gauge', hint: 'Point-kinetics' },
  aero: { formalism: 'ode', viz: 'aero', hint: 'Aero / attitude ODEs' },
};

/**
 * Handwritten models are catalogued as family "hand", which has no FAMILY_META
 * row. The formalism filter still has to keep them.
 */
export const HAND_FORMALISM = {
  'free-fall': 'ode',
  projectile: 'ode',
  'inclined-plane': 'ode',
  spring: 'ode',
  pendulum: 'ode',
  collision: 'ode',
  'collision-2d': 'ode',
  'double-pendulum': 'ode',
  wave: 'pde',
  heat: 'pde',
  lorentz: 'ode',
  'rc-circuit': 'circuit',
  rlc: 'circuit',
  orbit: 'ode',
  sorting: 'discrete',
  'bfs-grid': 'network',
  dijkstra: 'network',
  life: 'map',
  'logic-gates': 'digital',
  pipeline: 'digital',
  'cache-lru': 'digital',
  fifo: 'discrete',
  'beam-sfd-bmd': 'ode',
  'pid-tune': 'ode',
  'hodgkin-huxley': 'ode',
  'r016-显微镜': 'optics',
};

export function formalismFor(entry) {
  if (!entry) return '';
  const direct = entry.formalism || entry.capabilities?.formalism || '';
  if (direct) return direct;
  const mapped = entry.family ? FAMILY_META[entry.family]?.formalism : '';
  if (mapped) return mapped;
  return HAND_FORMALISM[entry.id] || '';
}

export function familyCapabilities(family, spec = {}) {
  const meta = FAMILY_META[family] || FAMILY_META.gauge;
  const base = {
    formalism: meta.formalism,
    viz: meta.viz,
    interaction: meta.viz.includes('algo') || meta.viz === 'netlist' || meta.viz === 'phet-optics'
      ? (meta.viz === 'phet-optics' || meta.viz === 'algo-graph' || meta.viz === 'netlist' ? 'canvas' : 'knobs')
      : 'knobs',
    hint: meta.hint,
    fidelity: 'principle',
  };
  if (spec.id === 'lens') {
    return {
      ...base,
      pointer: true,
      interaction: 'canvas',
      hint: 'Drag object to set u/h',
    };
  }
  if (family === 'graph' || family === 'logic') {
    return { ...base, pointer: true, interaction: 'canvas' };
  }
  return base;
}
