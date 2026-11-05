/**
 * 自建模型（localStorage）
 * 硬规则：权威来源 + 控制方程 + 假设 + 伦理核对；拒绝空壳「教学动画」。
 */
import { createFactoryModel } from '../models/factory.js';
import { topicMissNote } from './topicOverrides.js';
import { FAMILY_META } from './formalism.js';
import { t } from '../i18n/index.js';
import templates from '../../data/authority-templates.json' with { type: 'json' };

const STORAGE_KEY = 'immspfee-user-models-v1';

/** 允许自建挂接的引擎族（有完整 factory builder） */
const DEPRECATED_FAMILIES = new Set(Object.keys(templates.deprecatedFamilies || {}));

export const USER_MODEL_FAMILIES = Object.keys(FAMILY_META).filter(
  (k) => !['variant', 'hand'].includes(k) && !DEPRECATED_FAMILIES.has(k),
);

export function loadUserSpecs() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveUserSpecs(list) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * @param {object} draft
 * @returns {{ ok: true, spec: object } | { ok: false, error: string }}
 */
export function validateUserModelDraft(draft, opts = {}) {
  const name = String(draft.name || '').trim();
  const domain = String(draft.domain || '').trim();
  const sub = String(draft.sub || '').trim();
  const family = String(draft.family || '').trim();
  const formula = String(draft.formula || '').trim();
  const authority = String(draft.authority || '').trim();
  const assumptions = String(draft.assumptions || '').trim();
  const description = String(draft.description || '').trim();
  const fidelity = draft.fidelity === 'principle' ? 'principle' : 'engineering';
  const ethicsOk = !!draft.ethicsOk;

  const fail = (msg) => {
    const miss = topicMissNote(formula);
    return { ok: false, error: miss ? `${msg}；${miss}` : msg };
  };
  if (!name || name.length < 2) return fail(t('dialog.errNameShort'));
  if (!domain) return fail(t('dialog.errDomain'));
  if (!sub) return fail(t('dialog.errSub'));
  if (!USER_MODEL_FAMILIES.includes(family)) {
    return fail(t('dialog.errFamily', { family }));
  }
  if (formula.length < 3) return fail(t('dialog.errFormulaShort'));
  if (authority.length < 8) {
    return fail(t('dialog.errAuthorityShort'));
  }
  if (assumptions.length < 12) {
    return fail(t('dialog.errAssumptionsShort'));
  }
  if (!/(忽略|适用|范围|不是|线性|小角|集总|limit|neglect|assume|valid)/i.test(assumptions)) {
    return fail(t('dialog.errAssumptionsScope'));
  }
  if (description.length < 12) {
    return fail(t('dialog.errDescription'));
  }
  if (!ethicsOk) {
    return fail(t('dialog.errEthics'));
  }
  const toy = /好玩|动画|随便|demo only|just for fun/i;
  if (toy.test(`${name} ${description}`)) {
    return fail(t('dialog.errToy'));
  }

  const keepId = typeof opts.keepId === 'string' && opts.keepId.startsWith('user-')
    ? opts.keepId
    : '';
  const id = keepId || `user-${family}-${slug(name)}-${Date.now().toString(36)}`;
  const spec = {
    id,
    name,
    domain,
    sub,
    family,
    formula,
    description,
    fidelity,
    authority,
    assumptions,
    userBuilt: true,
    tags: [domain, sub, '自建'],
    createdAt: new Date().toISOString(),
  };
  return { ok: true, spec };
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'model';
}

export function persistUserSpec(spec) {
  const list = loadUserSpecs().filter((s) => s.id !== spec.id);
  list.unshift(spec);
  saveUserSpecs(list);
  return list;
}

export function deleteUserSpec(id) {
  const list = loadUserSpecs().filter((s) => s.id !== id);
  saveUserSpecs(list);
  return list;
}

/** 课堂机房同步：整包 JSON */
export function exportUserSpecsJson() {
  return `${JSON.stringify({ kind: 'immspfee-user-models', version: 1, models: loadUserSpecs() }, null, 2)}\n`;
}

/**
 * @param {string} text
 * @returns {{ ok: true, specs: object[], rejected: { error: string }[] } | { ok: false, error: string }}
 */
export function parseUserSpecsImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 无法解析' };
  }
  const raw = Array.isArray(data) ? data : data?.models;
  if (!Array.isArray(raw)) return { ok: false, error: '须为模型数组或 { models: [] }' };
  const specs = [];
  const rejected = [];
  for (const row of raw) {
    const checked = validateUserModelDraft(
      { ...row, ethicsOk: true },
      { keepId: row?.id },
    );
    if (!checked.ok) {
      rejected.push({ error: `${row?.name || row?.id || '?'}: ${checked.error}` });
      continue;
    }
    specs.push({ ...checked.spec, id: checked.spec.id, createdAt: row.createdAt || checked.spec.createdAt });
  }
  if (!specs.length) return { ok: false, error: rejected[0]?.error || '没有可导入的条目' };
  return { ok: true, specs, rejected };
}

export function mergeImportedSpecs(specs) {
  const byId = new Map(loadUserSpecs().map((s) => [s.id, s]));
  for (const s of specs) byId.set(s.id, s);
  const list = [...byId.values()];
  saveUserSpecs(list);
  return list;
}

/** 将自建 spec 建成可运行模型（factory） */
export function buildUserModel(spec) {
  const model = createFactoryModel({
    ...spec,
    description: [
      spec.description,
      spec.authority ? `权威：${spec.authority}` : '',
      spec.assumptions ? `假设：${spec.assumptions}` : '',
    ].filter(Boolean).join(' · '),
  });
  model.userBuilt = true;
  model.authority = spec.authority;
  model.assumptions = spec.assumptions;
  model.fidelity = spec.fidelity || model.fidelity || 'engineering';
  if (!model.tags?.includes('自建')) {
    model.tags = [...(model.tags || []), '自建'];
  }
  // 工业级：paramSchema 至少 4 个可调参，否则视为不合格壳
  const nParams = Object.keys(model.paramSchema || {}).length;
  if (nParams < 4) {
    console.warn(`[user-model] ${spec.id} paramSchema 仅 ${nParams} 项，低于工业级门槛`);
  }
  return model;
}

export function buildAllUserModels() {
  return loadUserSpecs().map(buildUserModel);
}
