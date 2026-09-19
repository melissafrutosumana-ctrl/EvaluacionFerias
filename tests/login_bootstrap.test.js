import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("el arranque de la aplicacion tambien funciona si el modulo termina despues del DOM", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");

  assert.match(source, /document\.readyState === "loading"/);
  assert.match(source, /document\.addEventListener\("DOMContentLoaded", bootstrapApp, \{ once: true \}\)/);
  assert.match(source, /void bootstrapApp\(\)/);
});
