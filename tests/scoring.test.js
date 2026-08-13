import { test } from "node:test";
import assert from "node:assert";
import { calcAverage, calcFinalScore, calcPronatecytFinalScore, calcExpotecnicaFinalScore } from "../js/utils.js";

test("calcAverage promedia solo los jueces que votaron", () => {
  const judges = [
    { voted: true, sum: 40 },
    { voted: true, sum: 30 },
    { voted: false, sum: 0 }
  ];
  assert.strictEqual(calcAverage(judges), 35);
});

test("calcAverage devuelve 0 si nadie votó", () => {
  assert.strictEqual(calcAverage([{ voted: false, sum: 50 }]), 0);
});

test("calcFinalScore hace 50/50 cuando hay expo y escrito", () => {
  assert.strictEqual(calcFinalScore(1, 40, 1, 80), 60);
});

test("calcFinalScore usa solo expo si no hay escrito", () => {
  assert.strictEqual(calcFinalScore(1, 40, 0, 0), 40);
});

test("calcFinalScore usa solo escrito si no hay expo", () => {
  assert.strictEqual(calcFinalScore(0, 0, 1, 80), 80);
});

test("calcPronatecytFinalScore F9B/F9C: 50% expo + 50% escrito normalizado", () => {
  // F9B max = 40, F9C raw max = 90
  const expected = (40 / 40) * 50 + (81 / 90) * 50;
  assert.strictEqual(calcPronatecytFinalScore("F9B", 40, 81), expected);
});

test("calcPronatecytFinalScore F13B: 100% exposición (sin escrito)", () => {
  assert.strictEqual(calcPronatecytFinalScore("F13B", 100, 0), 100);
});

test("calcPronatecytFinalScore F10B/F10C: escrito normalizado a raw 108", () => {
  const expected = (40 / 40) * 50 + (108 / 108) * 50;
  assert.strictEqual(calcPronatecytFinalScore("F10B", 40, 108), expected);
});

test("calcPronatecytFinalScore con expo parcial y escrito cero", () => {
  // F9B expo = 20 (mitad), escrito = 0
  const expected = (20 / 40) * 50 + 0;
  assert.strictEqual(calcPronatecytFinalScore("F9B", 20, 0), expected);
});

test("calcPronatecytFinalScore con código desconocido trata como 100% exposición", () => {
  // Código desconocido → cRawMax=0 → devuelve expoPts (sin escrito)
  assert.strictEqual(calcPronatecytFinalScore("XXX", 40, 0), 40);
});

test("calcExpotecnicaFinalScore STEAM: 50% expo (111) + 50% escrito (105)", () => {
  const expected = (111 / 111) * 50 + (105 / 105) * 50;
  assert.strictEqual(calcExpotecnicaFinalScore("DESAFIO STEAM", 111, 105), expected);
});

test("calcExpotecnicaFinalScore Modelo: expo (51) + escrito (72) normalizado", () => {
  const expected = (51 / 51) * 50 + (36 / 72) * 50;
  assert.strictEqual(calcExpotecnicaFinalScore("EMPRENDIMIENTO E INNOVACION", 51, 36), expected);
});

test("calcExpotecnicaFinalScore categoría desconocida devuelve expo crudo", () => {
  assert.strictEqual(calcExpotecnicaFinalScore("OTRA", 50, 0), 50);
});
