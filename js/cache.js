const CACHE_PREFIX = "ef_cache_v1:";

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

export function clearSessionCache() {
  const storage = getStorage();
  if (!storage) return;

  try {
    const keysToRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // La limpieza de caché no debe impedir el cierre de sesión.
  }
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
