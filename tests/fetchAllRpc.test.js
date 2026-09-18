import { test } from "node:test";
import assert from "node:assert";
import { fetchAllRpc } from "../js/utils.js";

function fakeClient(rows) {
  return {
    rpc() {
      return {
        range(from, to) {
          const page = rows.slice(from, to + 1);
          return Promise.resolve({ data: page, error: null });
        }
      };
    }
  };
}

test("fetchAllRpc acumula todas las paginas sin truncar a 1000", async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
  const all = await fetchAllRpc("get_x", {}, 1000, fakeClient(rows));
  assert.strictEqual(all.length, 2500);
  assert.strictEqual(all[2499].id, 2499);
});

test("fetchAllRpc corta con error si el servidor no respeta el rango (anti loop infinito)", async () => {
  const stubborn = {
    rpc() {
      return {
        range() {
          return Promise.resolve({
            data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
            error: null
          });
        }
      };
    }
  };
  await assert.rejects(fetchAllRpc("get_x", {}, 1000, stubborn), /superado el maximo/);
});

test("fetchAllRpc propaga errores de la RPC", async () => {
  const rpcError = new Error("permission denied");
  const client = {
    rpc() {
      return { range: async () => ({ data: null, error: rpcError }) };
    }
  };

  await assert.rejects(fetchAllRpc("get_private", {}, 100, client), /permission denied/);
});

test("fetchAllRpc rechaza un pageSize inválido", async () => {
  await assert.rejects(fetchAllRpc("get_x", {}, 0, fakeClient([])), /pageSize debe ser un entero positivo/);
  await assert.rejects(fetchAllRpc("get_x", {}, 1.5, fakeClient([])), /pageSize debe ser un entero positivo/);
});

test("fetchAllRpc no salta filas aunque se solicite más que el límite de PostgREST", async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
  const cappedClient = {
    rpc() {
      return {
        range(from, to) {
          const cappedTo = Math.min(to, from + 999);
          return Promise.resolve({ data: rows.slice(from, cappedTo + 1), error: null });
        }
      };
    }
  };

  const all = await fetchAllRpc("get_x", {}, 1600, cappedClient);
  assert.strictEqual(all.length, rows.length);
  assert.deepStrictEqual(all.map((row) => row.id), rows.map((row) => row.id));
});
