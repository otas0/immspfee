/**
 * Audit helpers only — no runtime import from topicModel / shells.
 * Returns stable key ids (`caveat.nuclear` …); localized copy was removed from
 * `strings.js` to shrink the lab bundle (no on-stage caveat chrome).
 */
export function designCaveatKey(model) {
  if (!model) return '';
  const blob = `${model.id || ''} ${model.name || ''} ${model.sub || ''} ${model.formula || ''} ${(model.tags || []).join(' ')}`;
  if (/核工程|核物理|裂变|聚变|反应堆|中子|劳逊|剂量|屏蔽|链式反应|neutron|fission|fusion|reactor|lawson/i.test(blob)) {
    return 'caveat.nuclear';
  }
  if (/平衡与电化学|电解|电镀|燃料电池|能斯特|腐蚀|electrochem|electrolysis|fuel cell|nernst/i.test(blob)) {
    return 'caveat.electrochem';
  }
  if (/生物膜|Goldman|膜运输|膜电位|动作电位|Hodgkin|药代|membrane|action potential/i.test(blob)) {
    return 'caveat.membrane';
  }
  return '';
}

/** Returns the i18n key (not localized text) so this module stays free of runtime i18n imports. */
export function designCaveatText(model) {
  return designCaveatKey(model);
}
