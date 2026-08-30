export const PRODUCT_SLUG = 'agent-audit-ledger';
export const API_BASE = 'https://api.sociobot.in/api/v1';
export const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const DAY = 86_400_000;

export function captureLicense({ location = window.location, history = window.history, storage = localStorage } = {}) {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return storage.getItem(LICENSE_KEY);
  storage.setItem(LICENSE_KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return token;
}

export async function verifyLicense(token, { storage = localStorage, fetcher = fetch, now = Date.now() } = {}) {
  if (!token) return { valid: false, reason: 'missing' };
  let cached = null;
  try { cached = JSON.parse(storage.getItem(VERDICT_KEY) || 'null'); } catch { /* Ignore damaged optional cache data. */ }
  const cacheAge = now - cached?.checkedAt;
  const freshCache = cached?.token === token && typeof cached.valid === 'boolean'
    && Number.isFinite(cacheAge) && cacheAge >= 0 && cacheAge < DAY;
  if (freshCache) return { ...cached, cached: true };
  try {
    const response = await fetcher(`${API_BASE}/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verification unavailable');
    const verdict = await response.json();
    const saved = { ...verdict, token, checkedAt: now };
    storage.setItem(VERDICT_KEY, JSON.stringify(saved));
    return saved;
  } catch {
    if (cached?.token === token && cached.valid) return { ...cached, offline: true };
    return { valid: false, reason: 'offline' };
  }
}

export function saveLicense(token, storage = localStorage) {
  const value = token.trim();
  if (!value) throw new Error('Paste the license token from your receipt.');
  storage.setItem(LICENSE_KEY, value);
  return value;
}
