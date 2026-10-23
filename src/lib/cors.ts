const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Returns the www / bare-domain twin of an origin, or null when there isn't a sensible one.
 *   https://www.example.com -> https://example.com
 *   https://example.com     -> https://www.example.com
 * localhost, IP addresses and deeper subdomains (app.example.com) are left alone, so a
 * single configured origin can never widen into an unrelated host.
 */
export function wwwTwin(origin: string): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname;
  if (host === 'localhost' || IPV4.test(host) || host.includes(':')) return null;

  const labels = host.split('.');
  let twinHost: string | null = null;
  if (labels[0] === 'www' && labels.length >= 3) {
    twinHost = labels.slice(1).join('.');
  } else if (labels[0] !== 'www' && labels.length === 2) {
    twinHost = `www.${host}`;
  }
  if (!twinHost) return null;

  url.hostname = twinHost;
  return url.origin;
}

/** Parses a comma-separated origin list and adds each entry's www/bare twin. */
export function parseOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const all = new Set(origins);
  for (const origin of origins) {
    const twin = wwwTwin(origin);
    if (twin) all.add(twin);
  }
  return [...all];
}
