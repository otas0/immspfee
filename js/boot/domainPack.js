/**
 * Wire format for the subject index. Repeated domain names are stored once.
 * Formula stays in per-domain JSON; display names live in data/domain-names.json
 * (lazy — loaded on first search) so the cold index stays smaller.
 * Packed row: [id, d, sub, family]. Callers still see { id, domain, sub, name, family }.
 */
export function packDomainIndex(rows) {
  const domains = [];
  const packed = rows.map((row) => {
    const domain = row.domain || '其他';
    let code = domains.indexOf(domain);
    if (code < 0) {
      code = domains.length;
      domains.push(domain);
    }
    return [
      row.id,
      code,
      row.sub || '',
      row.family || '',
    ];
  });
  return { domains, rows: packed };
}

/** Parallel name list (same order as packed rows) for search / sidebar labels. */
export function packDomainNames(rows) {
  return rows.map((row) => row.name || row.id);
}

export function expandDomainIndex(payload, names = null) {
  if (Array.isArray(payload)) return payload;
  const domains = payload?.domains || [];
  return (payload?.rows || []).map((row, i) => {
    if (Array.isArray(row)) {
      // New: [id, d, sub, family]  Legacy: [id, d, sub, name, family]
      let id; let d; let sub; let name; let family;
      if (row.length >= 5) {
        [id, d, sub, name, family] = row;
      } else {
        [id, d, sub, family] = row;
        name = (Array.isArray(names) && names[i]) || id;
      }
      return {
        id,
        domain: domains[d] || '其他',
        sub: sub || '',
        name: name || id,
        family: family || '',
        formula: '',
      };
    }
    return {
      id: row.id,
      domain: domains[row.d] || '其他',
      sub: row.sub || '',
      name: row.name || (Array.isArray(names) && names[i]) || row.id,
      family: row.family || '',
      formula: row.formula || '',
    };
  });
}
