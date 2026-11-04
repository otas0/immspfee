/**
 * 万能壳：统一 Model 接口 → 同一套 UX（对齐 scikit-complexity catalog 思路，Canvas 可视化）。
 * 约定（死规则）：
 * - params + paramSchema
 * - init / step / draw / getReadouts / refresh
 * - 可选 onPointer / runAction / recompute / getEnergy / getEnergyAt / getTrajectory / capabilities
 */

export function deriveCapabilities(model) {
  if (!model) {
    return {
      id: '',
      interaction: 'none',
      hint: '',
      paramCount: 0,
      hasPointer: false,
      hasEnergy: false,
      hasTextParams: false,
      actions: [],
      formalism: '',
      fidelity: 'principle',
      focusGroups: ['dynamics'],
    };
  }
  const schema = model.paramSchema || {};
  const keys = Object.keys(model.params || {});
  const groups = new Set();
  let hasTextParams = false;
  for (const k of keys) {
    const g = schema[k]?.group || 'dynamics';
    groups.add(g);
    if (schema[k]?.allowText || typeof model.params[k] === 'string') hasTextParams = true;
  }
  const declared = model.capabilities || {};
  const hasPointer = typeof model.onPointer === 'function' || !!declared.pointer;
  const interaction = declared.interaction
    || (hasPointer ? 'canvas' : (hasTextParams ? 'text+knobs' : 'knobs'));
  const hint = declared.hint
    || (hasPointer
      ? '画布可交互'
      : '右侧调参');

  const focusGroups = ['dynamics'];
  if (keys.length < 20 && groups.has('initial')) focusGroups.push('initial');

  return {
    id: model.id,
    interaction,
    hint,
    paramCount: keys.length,
    hasPointer,
    hasEnergy: typeof model.getEnergy === 'function',
    hasTextParams,
    actions: Array.isArray(declared.actions) ? declared.actions : [],
    formalism: declared.formalism || model.formalism || '',
    viz: declared.viz || '',
    fidelity: declared.fidelity || model.fidelity || 'principle',
    focusGroups,
    tags: model.tags || [],
    sub: model.sub || '',
  };
}

/**
 * 参数 ≥20：默认只展开 dyn（+ focus）；其余 accordion。
 * 较少参数时仍折叠 numerics/display。
 */
export function shouldAutoFoldGroup(group, paramCount, focusGroups = ['dynamics']) {
  if (focusGroups.includes(group)) return false;
  if (paramCount >= 20) return true;
  if (group === 'dynamics') return false;
  if (paramCount >= 14 && (group === 'numerics' || group === 'display')) return true;
  if (paramCount >= 20 && group === 'initial') return true;
  return false;
}
