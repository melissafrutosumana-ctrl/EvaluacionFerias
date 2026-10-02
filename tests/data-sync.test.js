import test from "node:test";
import assert from "node:assert/strict";
import { startAdminReferenceDataSync, startEvaluationsSync, stopAdminReferenceDataSync, stopEvaluationsSync } from "../js/data.js?v=3.34";
import { writeSessionCache, readSessionCache } from "../js/cache.js";

function installBrowserMocks(rowsByFunction) {
  const previous = {
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    fetch: Object.getOwnPropertyDescriptor(globalThis, "fetch"),
    sessionStorage: Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
  };
  const listeners = new Map();
  const requests = [];
  const storageEntries = new Map();
  let timerId = 0;

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      visibilityState: "visible",
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name, listener) => {
        if (listeners.get(name) === listener) listeners.delete(name);
      }
    }
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setInterval: () => ++timerId, clearInterval: () => {} }
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      get length() { return storageEntries.size; },
      key: (index) => [...storageEntries.keys()][index] ?? null,
      getItem: (key) => storageEntries.get(key) ?? null,
      setItem: (key, value) => storageEntries.set(key, String(value)),
      removeItem: (key) => storageEntries.delete(key)
    }
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (_url, options) => {
      const { functionName, params } = JSON.parse(options.body);
      requests.push({ functionName, params });
      const [start, end] = (options.headers.Range ?? "0-999").split("-").map(Number);
      const rows = rowsByFunction[functionName] ?? [];
      return new Response(JSON.stringify({ data: rows.slice(start, end + 1) }), { status: 200 });
    }
  });

  return {
    listeners,
    requests,
    restore() {
      stopEvaluationsSync();
      stopAdminReferenceDataSync();
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  };
}

test("evaluations sync completa la instantánea vencida aunque hubo sync incremental reciente", async() => {
  const now = Date.now();
  const mocks = installBrowserMocks({
    get_evaluations: [],
    get_evaluations_since: []
  });
  const updates = [];
  writeSessionCache("admin:evaluations", {
    version: 4,
    complete: true,
    rows: [{ id: 91, proyecto_id: 12 }],
    rowCount: 1,
    syncedAt: now,
    lastFullSyncAt: now - 5 * 60 * 1000
  });

  try {
    startEvaluationsSync((rows) => updates.push(rows));
    await new Promise((resolve) => setTimeout(resolve, 15));

    assert.deepEqual(mocks.requests.map(({ functionName }) => functionName), ["get_evaluations"]);
    assert.deepEqual(updates, [[]]);
    assert.deepEqual(readSessionCache("admin:evaluations").rows, []);
  } finally {
    mocks.restore();
  }
});

test("la sincronización de referencia notifica cambios de puntaje y asignaciones sin esperar cambios en evaluaciones", async() => {
  const oldProject = { id: 4, puntaje_escrito_manual: null };
  const updatedProject = { id: 4, puntaje_escrito_manual: 18 };
  const oldAssignment = { juez_id: 2, proyecto_id: 4, tipo_evaluacion: "Escrito" };
  const updatedAssignment = { ...oldAssignment, juez_id: 3 };
  const mocks = installBrowserMocks({
    get_projects: [updatedProject],
    get_assignments: [updatedAssignment]
  });
  const updates = [];

  try {
    startAdminReferenceDataSync((projects, assignments) => updates.push({ projects, assignments }), {
      projects: [oldProject],
      assignments: [oldAssignment]
    });
    mocks.listeners.get("visibilitychange")();
    await new Promise((resolve) => setTimeout(resolve, 15));

    assert.deepEqual([...new Set(mocks.requests.map(({ functionName }) => functionName))].sort(), ["get_assignments", "get_projects"]);
    assert.deepEqual(updates, [{ projects: [updatedProject], assignments: [updatedAssignment] }]);
  } finally {
    mocks.restore();
  }
});
