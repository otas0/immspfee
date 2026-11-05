/**
 * Whitelist translation for assumption bodies and formula bars.
 * Longer phrases win. glyphRows loads on demand so Chinese boots skip the lexicon.
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
    });
  }
  return rowsReady;
}

export function glyphRowsReady() {
  return buckets.size > 0;
}

export function translateCatalogText(locale, text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw || locale === 'zh' || IDX[locale] == null) return raw;
  if (!buckets.size) return raw;
  const idx = IDX[locale] + 1;
  let out = '';
  for (let i = 0; i < raw.length;) {
    const list = buckets.get(raw[i]);
    let hit = null;
    if (list) {
      for (const row of list) {
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
    } else {
      const punct = PUNCT[locale]?.[raw[i]];
      out += punct != null ? punct : raw[i];
      i += 1;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}
