/**
 * 万能壳：从任意模型推导统一能力描述，驱动同一套 UX。
 * 约定（死规则）：
 * - params + paramSchema
 * - init / step / draw / getReadouts / refresh
 * - 可选 onPointer / recompute / getEnergy / getTrajectory / capabilities
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
      focusGroups: ['dynamics', 'initial', 'numerics', 'display', 'custom'],
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
      ? '画布可直接拖拽/点选；右侧旋钮与文本同步生效'
      : '右侧工作台调节参数；dyn=live，init/num=重置');

  return {
    id: model.id,
    interaction,
    hint,
    paramCount: keys.length,
    hasPointer,
    hasEnergy: typeof model.getEnergy === 'function',
    hasTextParams,
    focusGroups: ['dynamics', 'initial', 'numerics', 'display', 'custom'].filter(
      (g) => g === 'custom' || g === 'dynamics' || groups.has(g) || g === 'initial',
    ),
    tags: model.tags || [],
    sub: model.sub || '',
  };
}

/** 参数过多时默认折叠非 dyn，保持万能台不爆炸 */
export function shouldAutoFoldGroup(group, paramCount) {
  if (group === 'dynamics') return false;
  if (paramCount >= 14 && (group === 'numerics' || group === 'display')) return true;
  if (paramCount >= 20 && group === 'initial') return true;
  return false;
}
