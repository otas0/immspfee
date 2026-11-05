/**
 * Whitelist translation for assumption bodies and formula bars.
 * Longer phrases win. Any leftover character is still a catalog entry, never raw Han.
 */
import { ROWS } from './glyphRows.js';

const IDX = { en: 0, ja: 1, ko: 2, es: 3, fr: 4, de: 5 };
const PUNCT = {
  en: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
  ja: { '、': '、', '；': '。', '，': '、', '。': '。' },
  ko: { '、': ', ', '；': '. ', '，': ', ', '。': '. ' },
  es: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
  fr: { '、': ' ; ', '；': ' ; ', '，': ', ', '。': '. ' },
  de: { '、': '; ', '；': '; ', '，': ', ', '。': '. ' },
};

const buckets = new Map();
for (const row of ROWS) {
  const zh = row[0];
  if (!zh) continue;
  const ch = zh[0];
  if (!buckets.has(ch)) buckets.set(ch, []);
  buckets.get(ch).push(row);
}
for (const list of buckets.values()) list.sort((a, b) => b[0].length - a[0].length);

export function translateCatalogText(locale, text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw || locale === 'zh' || IDX[locale] == null) return raw;
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
      out += hit[idx];
      i += hit[0].length;
    } else {
      const punct = PUNCT[locale]?.[raw[i]];
      out += punct != null ? punct : raw[i];
      i += 1;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}
