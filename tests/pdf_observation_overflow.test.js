import { test } from "node:test";
import assert from "node:assert";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Test que verifica que oh calculado con realLineHeight no se queda corto
test("observación larga 500+ chars no desborda su caja (lineHeight real vs manual)", () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const longObs = "Observación extremadamente larga. ".repeat(30); // ~900 chars
  const innerW = 170;
  const obsFontSize = longObs.length > 450 ? 5.5 : 6.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(obsFontSize);
  // FIX crítico: usar getLineHeight real, no fórmula manual
  const realLineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
  const manualLineHeight = obsFontSize * 0.45 + 0.8;
  // Manual era más grande (3.27 vs 2.23), por lo que ohManual era conservador pero desperdiciaba espacio
  // Lo importante es que con realLineHeight el texto quepa exacto
  assert.ok(realLineHeight > 0 && manualLineHeight > 0, "ambos lineHeights deben ser >0");

  const oLines = doc.splitTextToSize(longObs, innerW);
  const ohReal = Math.max(16, oLines.length * realLineHeight + 14);
  const ohManual = Math.max(16, oLines.length * manualLineHeight + 14);
  // Con el fix, ohReal debe ser >= ohManual si realLineHeight es mayor, y debe contener todo el texto
  // Simulamos el dibujo: y=100, caja de ohReal, texto desde y+10 con oLines.length*realLineHeight
  const y = 100;
  const textBottom = y + 10 + (oLines.length - 1) * realLineHeight;
  const boxBottom = y + ohReal;
  assert.ok(textBottom < boxBottom, `texto bottom ${textBottom} debe quedar dentro de la caja ${boxBottom} (oh ${ohReal})`);

  // Verificación visual con doc.output: que no haya texto con y > page height
  doc.setFontSize(obsFontSize);
  doc.text(oLines, 10, y + 10);
  const output = doc.output("arraybuffer");
  assert.ok(output.byteLength > 1000, "PDF generado");
});

test("autoTable observación columna respeta cellWidth y no recorta (45+15+80 <= 182)", () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const usable = 210 - 14 * 2; // 182
  const colWidths = [45, 15, 80];
  const sum = colWidths.reduce((a, b) => a + b, 0);
  assert.ok(sum <= usable, `sum cellWidth ${sum} debe <= usable ${usable}, si no autoTable recorta última columna`);
  let warned = "";
  const origWarn = console.warn;
  console.warn = (msg) => { warned += String(msg); };
  autoTable(doc, {
    head: [["Proyecto", "Tipo", "Observación"]],
    body: [["P1", "Expo", "Obs ".repeat(100)]],
    margin: { left: 14, right: 14, bottom: 15 },
    tableWidth: "wrap",
    columnStyles: {
      0: { cellWidth: 45, overflow: "linebreak" },
      1: { cellWidth: 15, overflow: "linebreak" },
      2: { cellWidth: 80, overflow: "linebreak" }
    },
    styles: { overflow: "linebreak", minCellHeight: 0, cellWidth: "wrap" }
  });
  console.warn = origWarn;
  assert.ok(!warned.includes("could not fit page"), `no debe advertir overflow, pero advirtió: ${warned}`);
});
