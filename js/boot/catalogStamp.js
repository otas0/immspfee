/**
 * Shared asset-stamp reader for entry preload and domain fetches.
 */
let stampPromise = null;

export function loadAssetStamp() {
  if (!stampPromise) {
    const href = typeof document !== 'undefined'
      ? new URL('asset-stamp.json', document.baseURI).href
      : new URL('../../asset-stamp.json', import.meta.url).href;
    stampPromise = fetch(href, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return stampPromise;
}

export function withStamp(path, version) {
  if (!version) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}v=${encodeURIComponent(version)}`;
}

export function domainIndexUrl(stamp) {
  return withStamp('./data/domain-index.json', stamp?.domainIndex);
}

export function domainChunkUrl(domain, stamp) {
  const file = `./data/domains/${encodeURIComponent(domain)}.json`;
  return withStamp(file, stamp?.domains?.[domain]);
}
