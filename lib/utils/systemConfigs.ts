let cachedConfigs: Record<string, any> | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30000; // 30s cache

export async function fetchSystemConfigs(forceRefresh = false): Promise<Record<string, any>> {
  const now = Date.now();
  if (!forceRefresh && cachedConfigs && now - lastFetch < CACHE_TTL_MS) {
    return cachedConfigs;
  }
  try {
    const res = await fetch('/api/app-configs', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch configs');
    const data = await res.json();
    const result = data.configs || {};
    cachedConfigs = result;
    lastFetch = now;
    return result;
  } catch (err) {
    console.error('fetchSystemConfigs error:', err);
    return cachedConfigs || {};
  }
}

export function invalidateSystemConfigsCache() {
  cachedConfigs = null;
  lastFetch = 0;
}
