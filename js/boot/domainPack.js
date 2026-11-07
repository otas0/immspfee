/**
 * Wire format for the subject index. Repeated domain names are stored once.
 * Formula stays in per-domain JSON (not the cold index) to keep first paint small.
 * Rows pack as short arrays [id, d, sub, name, family] (~half the object form).
 * Callers still see `{ id, domain, sub, name, family, formula? }`.
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
      row.name || row.id,
      row.family || '',
    ];
  });
  return { domains, rows: packed };
}

export function expandDomainIndex(payload) {
  if (Array.isArray(payload)) return payload;
  const domains = payload?.domains || [];
  return (payload?.rows || []).map((row) => {
    if (Array.isArray(row)) {
      const [id, d, sub, name, family] = row;
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
      name: row.name || row.id,
      family: row.family || '',
      formula: row.formula || '',
    };
  });
}
