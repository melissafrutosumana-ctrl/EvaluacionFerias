import test from "node:test";
import assert from "node:assert/strict";
import { mergeRowsById } from "../js/cache.js";

test("mergeRowsById conserva filas y reemplaza evaluaciones actualizadas", () => {
  const currentRows = [
    { id: 1, nota: 3 },
    { id: 2, nota: 2 }
  ];
  const changedRows = [
    { id: 2, nota: 4 },
    { id: 3, nota: 1 }
  ];

  assert.deepEqual(mergeRowsById(currentRows, changedRows), [
    { id: 1, nota: 3 },
    { id: 2, nota: 4 },
    { id: 3, nota: 1 }
  ]);
});
