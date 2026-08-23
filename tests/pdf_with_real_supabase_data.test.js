import { test } from "node:test";
import assert from "node:assert";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simula datos REALES de Supabase (extraídos de la estructura real de proyectos_ferias y evaluaciones)
// Estos datos tienen la misma forma que devuelve get_projects / get_evaluations / get_judge_projects
// y usan títulos, categorías y observaciones reales del sistema CTPM
const realProjects = [
  {
    id: 1,
    titulo: "Hidroponía inteligente para escuelas rurales de la Región Pacífico Central con sistema IoT de bajo costo y monitoreo ambiental",
    tipo_feria: "Feria Cientifica y Tecnologica",
    categoria_pronatecyt: "F9B - Investigación Científica",
    nivel_educativo: "Colegio Técnico Educación Diversificada",
    puntaje_escrito_manual: null
  },
  {
    id: 2,
    titulo: "Robot clasificador de desechos con visión artificial y brazo mecatrónico – Desafío STEAM con enfoque en economía circular y sostenibilidad",
    tipo_feria: "Feria Expotecnica",
    categoria_expotecnica: "DESAFIO STEAM",
    eje_tematico: "MECATRONICA",
    puntaje_escrito_manual: null
  },
  {
    id: 3,
    titulo: "Mural colectivo ‘Raíces de Matapalo’ – Instalación artística con pintura corporal, fotografía y esculturas vivientes",
    tipo_feria: "Festival Estudiantil de las Artes",
    categoria_festival: "Artes Visuales",
    subcategoria_festival: "MURAL",
    puntaje_escrito_manual: null
  },
  {
    id: 105,
    titulo: "Fermentación controlada de cacao orgánico para producción de chocolate fino con trazabilidad blockchain",
    tipo_feria: "Feria Expotecnica",
    categoria_expotecnica: "EMPRENDIMIENTO E INNOVACION",
    eje_tematico: "INDUSTRIA ALIMENTARIA",
    puntaje_escrito_manual: null
  }
];

const realEvaluations = [
  // Evaluaciones reales (criterios de PRONAFECYT F9B y ExpoTECH)
  { proyecto_id: 1, juez_id: 10, criterio: "La escogencia del problema demuestra creatividad y originalidad.", nota: 3, tipo_evaluacion: "Exposición" },
  { proyecto_id: 1, juez_id: 10, criterio: "Los objetivos tienen relación con el problema de investigación.", nota: 2, tipo_evaluacion: "Exposición" },
  { proyecto_id: 1, juez_id: 11, criterio: "La escogencia del problema demuestra creatividad y originalidad.", nota: 2, tipo_evaluacion: "Exposición" },
  { proyecto_id: 2, juez_id: 10, criterio: "Define el problema de forma precisa.", nota: 3, tipo_evaluacion: "Exposición" },
  { proyecto_id: 2, juez_id: 10, criterio: "Plantea alternativas de solución con conceptos teórico-prácticos atinentes.", nota: 3, tipo_evaluacion: "Exposición" },
  { proyecto_id: 105, juez_id: 12, criterio: "Describe de forma clara y precisa los antecedentes que fundamentan la propuesta de valor del emprendimiento de cacao.", nota: 3, tipo_evaluacion: "Exposición" },
  { proyecto_id: 105, juez_id: 12, criterio: "Explica con solidez qué hace único al negocio y por qué es atractivo para el mercado nicho de chocolate fino.", nota: 3, tipo_evaluacion: "Exposición" },
];

const realObservations = new Map([
  [1, "Proyecto con excelente dominio del tema. Se recomienda profundizar en el análisis estadístico de variables y citar fuentes más recientes (últimos 5 años). Trabajo muy auténtico, evidente que lo hicieron las estudiantes."],
  [105, "Modelo de negocio innovador, cadena de valor bien definida. Requiere validar costos de certificación orgánica y logística de frío. ".repeat(5)], // larga 400+ chars
]);

test("PDF juez con datos reales de Supabase no desborda observación y respeta paginación", async () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const MARGIN = 14;
  const PAGE_LIMIT = 270;

  // Simula la función pdfCheckPage real
  function pdfCheckPage(y, needed) {
    if (y + needed > PAGE_LIMIT) {
      doc.addPage();
      return MARGIN;
    }
    return y;
  }

  let y = 20;
  // Simula el bloque de observación con datos reales largos (proyecto 105)
  const obs = realObservations.get(105);
  let obsFontSize = 6.5;
  if (obs.length > 280) obsFontSize = 6;
  if (obs.length > 450) obsFontSize = 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(obsFontSize);
  const realLineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
  const innerW = 182 - 6;
  const oLines = doc.splitTextToSize(obs, innerW);
  const oh = Math.max(16, oLines.length * realLineHeight + 14);
  const yBefore = y;
  y = pdfCheckPage(y, oh + 6);
  // Verifica que si y+oh no cabía, hizo salto de página (y reseteado a MARGIN)
  assert.ok(y + oh <= PAGE_LIMIT || y === MARGIN, "observación larga debe saltar de página si no cabe");

  // Dibuja caja y texto (simulado)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN + 2, y, 182 - 4, oh, 1.4, 1.4, "FD");
  doc.text(oLines, MARGIN + 6, y + 10);
  const textBottom = y + 10 + (oLines.length - 1) * realLineHeight;
  const boxBottom = y + oh;
  assert.ok(textBottom < boxBottom, `observación real no debe desbordar: textBottom ${textBottom} < boxBottom ${boxBottom}`);

  // Verifica que el PDF se generó y tiene al menos 1 página
  const out = doc.output("arraybuffer");
  assert.ok(out.byteLength > 2000, "PDF con datos reales debe generarse");
});

test("PDF admin ranking con datos reales respeta anchos y no recorta nombres", () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const usable = 210 - 14 * 2; // 182
  // Usa anchos reales del código corregido: 110 para proyecto + 22 tipo + 16 crit + 24 puntaje = 172 < 182
  const colWidths = [110, 22, 16, 24];
  const sum = colWidths.reduce((a, b) => a + b, 0);
  assert.ok(sum <= usable, `suma anchos ${sum} debe <= usable ${usable} para no recortar última columna`);

  // Genera tabla con títulos reales largos
  const body = realProjects.map(p => [p.titulo, p.tipo_feria, "Expo", "10"]);
  let warned = "";
  const origWarn = console.warn;
  console.warn = (m) => { warned += String(m); };
  autoTable(doc, {
    head: [["PROYECTO", "TIPO", "CRIT.", "PUNTAJE"]],
    body,
    margin: { left: 14, right: 14, bottom: 15 },
    tableWidth: "wrap",
    columnStyles: {
      0: { cellWidth: 110, overflow: "linebreak" },
      1: { cellWidth: 22, overflow: "linebreak" },
      2: { cellWidth: 16, overflow: "linebreak" },
      3: { cellWidth: 24, overflow: "linebreak" }
    },
    styles: { overflow: "linebreak", minCellHeight: 0, fontSize: 6.8 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const txt = (data.cell.text || []).join(" ");
        if (txt.length > 280) data.cell.styles.fontSize = 6;
      }
    }
  });
  console.warn = origWarn;
  assert.ok(!warned.includes("could not fit page"), `no debe advertir overflow con datos reales: ${warned}`);
  assert.ok(doc.lastAutoTable.finalY > 0, "autoTable con datos reales debe tener finalY");
});

test("PDF juez con proyecto real Fermentación #105 no deja blockchain huérfano", () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const title = realProjects.find(p => p.id === 105).titulo;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  const innerW = 182 - 6;
  const lines = doc.splitTextToSize(title, innerW);
  // Con el fix (full width 170, 7.2pt), Fermentación debe ser 1 línea, no 2 con blockchain solo
  assert.ok(lines.length === 1, `Fermentación con trazabilidad blockchain debe ser 1 línea con ancho completo, pero fue ${lines.length}: ${JSON.stringify(lines)}`);
  assert.ok(!lines.some(l => l.trim() === "blockchain"), "blockchain no debe quedar solo en una línea");
});
