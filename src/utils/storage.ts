// Storage can be disabled or full. Browsing must still work in that case.
export function readLocalValue(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function readCityList(key: string, fallback: string[] = []): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(saved) ? saved.filter((city): city is string => typeof city === 'string') : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalValue(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // In-memory state remains usable when persistence is unavailable.
  }
}
