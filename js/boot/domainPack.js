/**
 * Wire format for the subject index. Repeated domain names are stored once.
 * Callers still see `{ id, domain, sub, name, family, formula }`.
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
    return {
      id: row.id,
      d: code,
      sub: row.sub || '',
      name: row.name || row.id,
      family: row.family || '',
      formula: row.formula || '',
    };
  });
  return { domains, rows: packed };
}

export function expandDomainIndex(payload) {
  if (Array.isArray(payload)) return payload;
  const domains = payload?.domains || [];
  return (payload?.rows || []).map((row) => ({
    id: row.id,
    domain: domains[row.d] || '其他',
    sub: row.sub || '',
    name: row.name || row.id,
    family: row.family || '',
    formula: row.formula || '',
  }));
}
