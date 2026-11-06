/**
 * Nuclear, electrochemistry, and biomembrane entries stay public definitions.
 * Keep strings in catalog / i18n for audits only — do **not** paint them on the
 * canvas or shell strip (AGENTS: no on-stage assumption / caveat chrome).
 * Wording comes from the active locale for any non-stage consumer.
 */
import { t } from '../i18n/index.js';

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

export function designCaveatText(model) {
  const key = designCaveatKey(model);
  return key ? t(key) : '';
}
