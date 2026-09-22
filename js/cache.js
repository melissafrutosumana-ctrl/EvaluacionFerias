const CACHE_PREFIX = "ef_cache_v2:";

export const CACHE_SCOPE = Object.freeze({
  ALL: "all",
  EVALUATIONS: "evaluations"
});

const CACHE_KEYS_BY_SCOPE = Object.freeze({
  [CACHE_SCOPE.EVALUATIONS]: new Set(["admin:evaluations"])
});

function getStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function readSessionCache(key) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(`${CACHE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSessionCache(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearSessionCache(scope = CACHE_SCOPE.ALL) {
  const storage = getStorage();
  if (!storage) return;
  if (scope !== CACHE_SCOPE.ALL && !CACHE_KEYS_BY_SCOPE[scope]) return;

  try {
    const keysToRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      const logicalKey = key?.startsWith(CACHE_PREFIX) ? key.slice(CACHE_PREFIX.length) : "";
      if (scope === CACHE_SCOPE.ALL || CACHE_KEYS_BY_SCOPE[scope]?.has(logicalKey)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // La limpieza de caché no debe impedir el cierre de sesión.
  }
}

export function isSessionCacheFresh(cache, maxAgeMs, now = Date.now()) {
  if (!cache || !Number.isFinite(cache.syncedAt) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) return false;
  if (cache.syncedAt > now) return false;
  return now - cache.syncedAt <= maxAgeMs;
}

export function mergeRowsById(currentRows, changedRows) {
  const rowsById = new Map((currentRows ?? []).map((row) => [String(row.id), row]));

  for (const row of changedRows ?? []) {
    if (row?.id !== undefined && row?.id !== null) {
      rowsById.set(String(row.id), row);
    }
  }

  return [...rowsById.values()];
}
