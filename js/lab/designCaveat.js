/**
 * Nuclear, electrochemistry, and biomembrane entries stay public definitions.
 * The line sits under the canvas title and in the shell; it does not wait for the assumptions disclosure.
 */
export function designCaveatText(model) {
  if (!model) return '';
  const blob = `${model.id || ''} ${model.name || ''} ${model.sub || ''} ${model.formula || ''} ${(model.tags || []).join(' ')}`;
  if (/核工程|核物理|裂变|聚变|反应堆|中子|劳逊|剂量|屏蔽|链式反应|neutron|fission|fusion|reactor|lawson/i.test(blob)) {
    return '公开定义式，不是反应堆或装置设计工具';
  }
  if (/平衡与电化学|电解|电镀|燃料电池|能斯特|腐蚀|electrochem|electrolysis|fuel cell|nernst/i.test(blob)) {
    return '公开定义式，不是工艺或配方设计工具';
  }
  if (/生物膜|Goldman|膜运输|膜电位|动作电位|Hodgkin|药代|membrane|action potential/i.test(blob)) {
    return '公开定义式，不是临床或给药设计工具';
  }
  return '';
}
