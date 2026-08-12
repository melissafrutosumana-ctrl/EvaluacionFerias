import { supabase } from "./supabase.js";
import { showToast, FESTIVAL_FERIA_NAME, PRONAFECYT_CODE_MAX, PRONAFECYT_C_RAW_MAX, calcAverage, calcFinalScore } from "./utils.js";
import { getExpotecnicaRubricByCategory } from "./rubrics.js";

let jspdfPromise = null;

export function loadJSPDF() {
    if (window.jspdf ?.jsPDF) return Promise.resolve();
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = () => {
            if (window.jspdf ?.jsPDF) resolve();
            else reject(new Error("jsPDF not found after load"));
        };
        s.onerror = () => reject(new Error("Failed to load jspdf library"));
        document.head.appendChild(s);
    });
    return jspdfPromise;
}

let mepLogoPromise = null;
export async function loadMEPLogo() {
    if (window._mepLogoData) return window._mepLogoData;
    if (mepLogoPromise) return mepLogoPromise;
    mepLogoPromise = (async() => {
        try {
            const resp = await fetch("img/descarga.png");
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const blob = await resp.blob();
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            window._mepLogoData = base64;
            return base64;
        } catch (e) {
            console.warn("No se pudo cargar el logo del MEP:", e);
            window._mepLogoData = null;
            return null;
        }
    })();
    return mepLogoPromise;
}

export const PDF = {
    MARGIN: 18,
    PAGE_W: 210,
    PAGE_LIMIT: 272,
    PRIMARY: [0, 56, 101],
    GOLD: [204, 160, 59],
    GOLD_LIGHT: [255, 248, 231],
    INK: [30, 42, 58],
    MUTED: [100, 116, 139],
    BORDER: [203, 213, 225],
    ROW_ALT: [241, 245, 249],
    SUCCESS: [22, 163, 74],
    WARNING: [217, 119, 6],
    WHITE: [255, 255, 255],
};

export function pdfHeader(doc, title, logoDataUrl) {
    let y = PDF.MARGIN + 8;
    const headerH = 28;
    doc.setDrawColor(...PDF.PRIMARY);
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y - 5, PDF.PAGE_W - 2 * PDF.MARGIN, headerH, 2, 2, "F");

    const logoX = PDF.MARGIN + 4;
    const headerTextY = y;

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", logoX, headerTextY - 1, 38, 11);
        } catch (e) {
            console.warn("Error al añadir logo MEP:", e);
        }
    }

    const textX = PDF.MARGIN + 46;
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Ministerio de Educacion Publica", textX, headerTextY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Direccion Regional de Educacion Central del Pacifico", textX, headerTextY + 12);
    doc.text("Sistema de Evaluacion de Ferias Institucionales", textX, headerTextY + 17.5);

    y += headerH + 7;
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.8);
    doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
    y += 9;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text(title, PDF.MARGIN, y);
    y += 10;
    return y;
}

export function pdfFooter(doc, now) {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const fy = doc.internal.pageSize.height - 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...PDF.MUTED);
        doc.text(
            `Documento generado el ${now.toLocaleDateString("es-CR")} a las ${now.toLocaleTimeString("es-CR")} | Sistema de Evaluacion de Ferias`,
            PDF.MARGIN,
            fy
        );
        doc.text(`Pagina ${i} de ${pages}`, PDF.PAGE_W - PDF.MARGIN, fy, { align: "right" });
    }
}

export function pdfInfoBox(doc, lines, y) {
    const boxW = PDF.PAGE_W - 2 * PDF.MARGIN;
    const boxH = lines.length * 7 + 8;
    doc.setDrawColor(...PDF.GOLD);
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.roundedRect(PDF.MARGIN, y, boxW, boxH, 2.5, 2.5, "FD");
    doc.setTextColor(...PDF.PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    lines.forEach((line, i) => {
        doc.text(line, PDF.MARGIN + 5, y + 6 + i * 7);
    });
    return y + boxH + 10;
}

export function pdfProjectHeader(doc, titulo, y) {
    doc.setFillColor(...PDF.PRIMARY);
    doc.setDrawColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y, PDF.PAGE_W - 2 * PDF.MARGIN, 8, 1.5, 1.5, "F");
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(titulo, PDF.MARGIN + 3, y + 5.5);
    return y + 12;
}

export function pdfColHeader(doc, labels, positions, y) {
    doc.setTextColor(...PDF.MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    labels.forEach((label, i) => doc.text(label, positions[i], y));
    y += 4;
    doc.setDrawColor(...PDF.BORDER);
    doc.setLineWidth(0.3);
    doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
    return y + 3;
}

export function pdfCheckPage(doc, y, needed) {
    if (y > PDF.PAGE_LIMIT - (needed || 22)) {
        doc.addPage();
        return PDF.MARGIN;
    }
    return y;
}

export async function generateJudgePDF(user) {
    await loadJSPDF();
    const { data, error } = await supabase
        .from("evaluaciones_proyectos")
        .select("proyecto_id, criterio, nota, tipo_evaluacion, proyectos_ferias(titulo)")
        .eq("juez_id", user.id)
        .order("proyecto_id", { ascending: true });
    if (error) throw error;
    if (!data || !data.length) {
        showToast("No tienes evaluaciones guardadas para exportar.", "info");
        return;
    }

    // Group by project + tipo
    const grouped = new Map();
    data.forEach((item) => {
        const pid = Number(item.proyecto_id);
        const tipo = item.tipo_evaluacion ?? "Exposición";
        const key = `${pid}-${tipo}`;
        if (!grouped.has(key)) {
            grouped.set(key, {
                titulo: item.proyectos_ferias ?.titulo || "Proyecto",
                tipo,
                items: [],
                total: 0
            });
        }
        const g = grouped.get(key);
        g.items.push({ criterio: item.criterio, nota: Number(item.nota || 0) });
        g.total += Number(item.nota || 0);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const now = new Date();
    const M = PDF.MARGIN;
    const W = PDF.PAGE_W;
    const colNotaX = M + 155;
    const colPctX = M + 140;
    let y = pdfHeader(doc, "Reporte de Evaluaciones del Juez");

    const infoLines = [
        `Juez: ${user.nombre}`,
        `Fecha: ${now.toLocaleDateString("es-CR")}`,
        `Hora: ${now.toLocaleTimeString("es-CR")}`,
        user.tipo_feria ? `Feria: ${user.tipo_feria}` : "",
        `Proyectos evaluados: ${grouped.size}`
    ].filter(Boolean);
    y = pdfInfoBox(doc, infoLines, y);

    // === Summary table ===
    y = pdfCheckPage(doc, y, 16 + grouped.size * 7);
    doc.setDrawColor(...PDF.PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("RESUMEN", M, y);
    y += 5;

    // Summary header
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(M, y - 1, W - 2 * M, 5, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Proyecto", M + 2, y + 1.5);
    doc.text("Tipo", M + 75, y + 1.5);
    doc.text("Indicadores", colPctX, y + 1.5);
    doc.text("Puntaje", colNotaX, y + 1.5);
    y += 6;

    let grandTotal = 0;
    let rowIndex = 0;

    for (const [, g] of grouped) {
        y = pdfCheckPage(doc, y, 7);
        if (rowIndex % 2 === 1) {
            doc.setFillColor(...PDF.ROW_ALT);
            doc.rect(M, y - 2, W - 2 * M, 5.5, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF.INK);
        doc.text(g.titulo, M, y + 0.5);
        doc.setFont("helvetica", "bold");
        doc.text(g.tipo === "Escrito" ? "Escrito" : "Expo", M + 75, y + 0.5);
        doc.setFont("helvetica", "normal");
        doc.text(String(g.items.length), colPctX, y + 0.5);
        doc.text(String(g.total), colNotaX, y + 0.5);
        y += 5.5;
        grandTotal += g.total;
        rowIndex++;
    }

    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("TOTAL GENERAL", M, y);
    doc.text(`${grandTotal} puntos`, colNotaX, y);
    y += 8;

    // === Details per project ===
    y = pdfSubHeader(doc, "Detalle por proyecto", y);

    rowIndex = 0;

    for (const [, g] of grouped) {
        y = pdfCheckPage(doc, y, 22 + g.items.length * 6);
        const headerLabel = `${g.titulo} [${g.tipo === "Escrito" ? "Escrito" : "Exposición"}]`;
        y = pdfProjectHeader(doc, headerLabel, y);

        y = pdfColHeader(doc, ["Criterio de evaluacion", "Nota"], [M, colNotaX], y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...PDF.INK);
        doc.setFontSize(8);
        for (const item of g.items) {
            y = pdfCheckPage(doc, y, 6);
            if (rowIndex % 2 === 1) {
                doc.setFillColor(...PDF.ROW_ALT);
                doc.rect(M, y - 3, W - 2 * M, 6, "F");
            }
            doc.text(item.criterio, M, y);
            doc.text(String(item.nota), colNotaX, y, { align: "right" });
            y += 6;
            rowIndex++;
        }

        y += 1;
        doc.setDrawColor(...PDF.GOLD);
        doc.setLineWidth(0.4);
        doc.line(M, y, W - M, y);
        y += 2.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...PDF.PRIMARY);
        const maxPossible = g.items.length * 3;
        doc.text(`Total: ${g.total} / ${maxPossible} puntos (${Math.round(g.total / maxPossible * 100)}%)`, M, y);
        doc.setFontSize(7);
        doc.setTextColor(...PDF.MUTED);
        doc.text(`${g.items.length} criterio${g.items.length !== 1 ? "s" : ""}`, colNotaX, y, { align: "right" });
        y += 9;
    }

    y += 3;
    y = pdfCheckPage(doc, y, 18);
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 6;
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.roundedRect(M, y - 3, W - 2 * M, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("PUNTAJE TOTAL GENERAL", M + 4, y + 4);
    doc.text(`${grandTotal} puntos`, W - M - 4, y + 4, { align: "right" });

    pdfFooter(doc, now);
    doc.save(`evaluaciones_${user.nombre.replace(/\s+/g, "_")}.pdf`);
}

export function pdfSubHeader(doc, title, y) {
  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.8);
  doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text(title, PDF.MARGIN, y);
  y += 8;
  return y;
}

export async function generateAdminPDF() {
  await loadJSPDF();
  const logoData = await loadMEPLogo();

  try {
    const [users, projectsResult, evaluations, assignmentsResult] = await Promise.all([
      loadUsers(),
      supabase.from("proyectos_ferias").select("id, titulo, tipo_feria, categoria_expotecnica, categoria_pronatecyt"),
      fetchAllEvaluations(),
      supabase.from("asignaciones_jueces").select("juez_id, proyecto_id, tipo_evaluacion")
    ]);

    if (projectsResult.error) {
      throw new Error("Error al cargar datos");
    }

    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";
    const allProjects = projectsResult.data ?? [];
    const filteredProjects = selectedFeria
      ? allProjects.filter((p) => p.tipo_feria === selectedFeria)
      : allProjects;

    const projectIds = new Set(filteredProjects.map((p) => p.id));
    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
    const filteredEvals = (evaluations ?? []).filter((r) => projectIds.has(r.proyecto_id));

    if (!filteredEvals.length) {
      showToast("No hay evaluaciones para generar el reporte.", "info");
      return;
    }

    // Build score data per project per judge per tipo
    const votedSet = new Set();
    const scoreMap = new Map();
    filteredEvals.forEach((row) => {
      const tipo = row.tipo_evaluacion ?? "Exposición";
      const key = `${row.proyecto_id}-${row.juez_id}-${tipo}`;
      votedSet.add(key);
      const nota = Number(row.nota);
      if (!Number.isNaN(nota)) {
        scoreMap.set(key, (scoreMap.get(key) || 0) + nota);
      }
    });

    // Group assignments by project
    const assignmentsByProject = new Map();
    (assignmentsResult.data ?? []).forEach((a) => {
      if (projectIds.has(a.proyecto_id)) {
        if (!assignmentsByProject.has(a.proyecto_id)) {
          assignmentsByProject.set(a.proyecto_id, []);
        }
        assignmentsByProject.get(a.proyecto_id).push({
          juez_id: a.juez_id,
          tipo_evaluacion: a.tipo_evaluacion ?? "Exposición",
          judgeName: usersById?.get(a.juez_id)?.nombre ?? `Juez #${a.juez_id}`
        });
      }
    });

    // Build results (same logic as renderAdminScoresTable)
    const results = [];
    for (const [projectId, assignedJudges] of assignmentsByProject) {
      if (!projectsById.has(projectId)) continue;
      const expoJudges = [];
      const escritoJudges = [];
      let expoVoted = 0, expoTotal = 0;
      let escritoVoted = 0, escritoTotal = 0;

      assignedJudges.forEach((aj) => {
        const tipo = aj.tipo_evaluacion ?? "Exposición";
        const key = `${projectId}-${aj.juez_id}-${tipo}`;
        const voted = votedSet.has(key);
        const entry = { judgeName: aj.judgeName, sum: scoreMap.get(key) || 0, voted };
        if (aj.tipo_evaluacion === "Escrito") {
          escritoJudges.push(entry);
          escritoTotal++;
          if (voted) escritoVoted++;
        } else {
          expoJudges.push(entry);
          expoTotal++;
          if (voted) expoVoted++;
        }
      });
      const expoAvg = calcAverage(expoJudges);
      const escritoAvg = calcAverage(escritoJudges);
      const evalComplete =
        (expoTotal === 0 || expoVoted === expoTotal) &&
        (escritoTotal === 0 || escritoVoted === escritoTotal);

      let pdfFinalScore = 0;
      if (evalComplete) {
        const projData = projectsById.get(projectId);
        if (projData?.tipo_feria === "Feria Cientifica y Tecnologica") {
          const bCode = String(projData?.categoria_pronatecyt || "").split(" ")[0];
          const bMax = PRONAFECYT_CODE_MAX[bCode] || 40;
          const cCode = bCode ? bCode.replace("B", "C") : "";
          const cRawMax = PRONAFECYT_C_RAW_MAX[cCode] || 0;
          if (cRawMax > 0) {
            pdfFinalScore = (expoAvg / bMax) * 50 + (escritoAvg / cRawMax) * 50;
          } else {
            pdfFinalScore = expoAvg;
          }
        } else {
          pdfFinalScore = calcFinalScore(expoVoted, expoAvg, escritoVoted, escritoAvg);
        }
      }

      results.push({
        projectName: projectsById.get(projectId)?.titulo ?? "Proyecto",
        projectId,
        expoJudges, escritoJudges,
        expoTotal, expoVoted,
        escritoTotal, escritoVoted,
        expoAvg, escritoAvg,
        evalComplete,
        finalScore: pdfFinalScore
      });
    }
    results.sort((a, b) => b.finalScore - a.finalScore);

    // Find rubric max scores per project type
    function getMaxScoreForProject(pid, tipo) {
      const p = projectsById.get(pid);
      if (!p) return 0;
      const feria = p.tipo_feria ?? "";
      if (feria === "Feria Expotecnica") {
        const cat = p.categoria_expotecnica ?? "";
        if (!cat) return tipo === "Escrito" ? 72 : 51;
        const rubric = getExpotecnicaRubricByCategory(cat, tipo);
        if (rubric?.sections) {
          const count = rubric.sections.reduce((s, sec) => s + sec.indicators.length, 0);
          return count * 3;
        }
      }
      if (feria === "Feria Cientifica y Tecnologica") {
        let code = String(p.categoria_pronatecyt || "").split(" ")[0];
        if (tipo === "Escrito") code = code.replace("B", "C");
        return PRONAFECYT_CODE_MAX[code] || (tipo === "Escrito" ? 78 : 40);
      }
      if (feria === FESTIVAL_FERIA_NAME) {
        return tipo === "Escrito" ? 0 : 12;
      }
      return 0;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const now = new Date();
    const M = PDF.MARGIN;
    const W = PDF.PAGE_W;
    const col2X = M + 8;
    const col3X = M + 90;
    const col4X = M + 120;
    const col5X = M + 148;
    const col6X = W - M;
    let y = pdfHeader(doc, "Reporte de Resultados", logoData);
    const feriaLabel = selectedFeria || "Todas las ferias";
    const isFEA = selectedFeria === FESTIVAL_FERIA_NAME || (results.length > 0 && results.every(r => {
      const p = projectsById.get(r.projectId);
      return p && p.tipo_feria === FESTIVAL_FERIA_NAME;
    }));

    const infoLines = [
      `Feria: ${feriaLabel}`,
      `Total de proyectos: ${results.length}`,
      `Total de jueces participantes: ${usersById.size}`,
      `Total evaluaciones: ${evaluations.length}`,
      `Generado: ${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR")}`
    ];
    y = pdfInfoBox(doc, infoLines, y);

    // === TABLE 1: Ranking de proyectos ===
    y = pdfSubHeader(doc, "Ranking de proyectos", y);

    // Para FEA mostrar solo Puntaje, para dual mostrar Expo + Escrito
    const dualCols = !isFEA;
    const rankLabels = dualCols
      ? ["#", "Proyecto", "Expo", "Escrito", "Puntaje", "Estado"]
      : ["#", "Proyecto", "Puntaje", "Estado"];
    const rankPositions = dualCols
      ? [ M, { x: col2X }, { x: col3X }, { x: col4X }, { x: col5X, align: "right" }, { x: col6X, align: "right" } ]
      : [ M, { x: col2X }, { x: col5X, align: "right" }, { x: col6X, align: "right" } ];

    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(M, y - 2, W - 2 * M, 6, 1, 1, "F");
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    rankLabels.forEach((l, i) => {
      const pos = rankPositions[i];
      doc.text(l, pos.x || pos, y + 1.5, pos.align ? { align: pos.align } : undefined);
    });
    y += 8;

    let rowIndex = 0;
    results.forEach((r, idx) => {
      const isFirst = idx === 0;
      y = pdfCheckPage(doc, y, 7);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...PDF.ROW_ALT);
        doc.rect(M, y - 2, W - 2 * M, 6, "F");
      }

      // 1er lugar: fondo dorado + borde superior e inferior
      if (isFirst) {
        doc.setFillColor(...PDF.GOLD_LIGHT);
        doc.rect(M, y - 2, W - 2 * M, 6, "F");
        doc.setDrawColor(...PDF.GOLD);
        doc.setLineWidth(0.6);
        doc.line(M, y - 2, W - M, y - 2);
        doc.line(M, y + 4, W - M, y + 4);
      }

      const totalVoted = r.expoVoted + r.escritoVoted;
      let stateText = "Incompleta";
      let stateColor = PDF.WARNING;
      if (totalVoted === 0) {
        stateText = "Sin evaluar";
        stateColor = PDF.MUTED;
      } else if (r.evalComplete) {
        stateText = "Completa";
        stateColor = PDF.SUCCESS;
      }

      doc.setTextColor(...PDF.INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      doc.text(isFirst ? "#1" : String(idx + 1), M, y + 0.5);
      doc.text(r.projectName, col2X, y + 0.5);

      if (dualCols) {
        // Feria con Expo + Escrito
        const expoMax = getMaxScoreForProject(r.projectId, "Exposición");
        const escritoMax = getMaxScoreForProject(r.projectId, "Escrito");
        const expoScore = r.expoTotal > 0 && r.expoVoted > 0 ? Math.round(r.expoAvg) : "—";
        const escritoScore = r.escritoTotal > 0 && r.escritoVoted > 0 ? Math.round(r.escritoAvg) : "—";
        doc.text(`${expoScore}/${expoMax}`, col3X, y + 0.5);
        doc.text(`${escritoScore}/${escritoMax}`, col4X, y + 0.5);
        doc.setFont("helvetica", "bold");
        if (r.evalComplete) {
          doc.setTextColor(...PDF.INK);
          doc.text(`${Math.round(r.finalScore)}`, col5X, y + 0.5, { align: "right" });
        } else {
          doc.setTextColor(...PDF.MUTED);
          doc.text("N/A", col5X, y + 0.5, { align: "right" });
        }
      } else {
        // FEA: puntaje único
        const score = r.expoTotal > 0 && r.expoVoted > 0 ? Math.round(r.expoAvg) : 0;
        const maxScore = getMaxScoreForProject(r.projectId, "Exposición");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...PDF.INK);
        doc.text(`${score}/${maxScore}`, col5X, y + 0.5, { align: "right" });
      }

      // Estado
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...stateColor);
      doc.text(stateText, col6X, y + 0.5, { align: "right" });
      y += 6;
      rowIndex++;
    });

    doc.setDrawColor(...PDF.BORDER);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("PUNTAJE MAS ALTO:", M, y);
    const topScoreText = results[0]?.evalComplete
      ? `${Math.round(results[0].finalScore)} pts`
      : "N/A";
    doc.text(`${topScoreText} — ${results[0]?.projectName ?? ""}`, M + 45, y);
    y += 8;

    // === TABLE 2: Detalle de jueces por proyecto ===
    y = pdfSubHeader(doc, "Detalle de jueces por proyecto", y);

    for (const r of results) {
      const totalJudgeRows = r.expoJudges.length + r.escritoJudges.length;
      y = pdfCheckPage(doc, y, 22 + totalJudgeRows * 7);
      y = pdfProjectHeader(doc, r.projectName, y);

      const jLabels = ["Juez", "Tipo", "Puntaje", "Estado"];
      const jPos = [M, { x: M + 80 }, { x: M + 125 }, { x: col6X, align: "right" }];
      doc.setFillColor(...PDF.GOLD);
      doc.roundedRect(M, y - 1, W - 2 * M, 5, 0.8, 0.8, "F");
      doc.setTextColor(...PDF.WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      jLabels.forEach((l, i) => {
        const pos = jPos[i];
        doc.text(l, pos.x || pos, y + 1, pos.align ? { align: pos.align } : undefined);
      });
      y += 7;

      const allJudgeEntries = [
        ...r.expoJudges.map((j) => ({ ...j, tipo: "Exposición" })),
        ...r.escritoJudges.map((j) => ({ ...j, tipo: "Escrito" }))
      ];

      rowIndex = 0;
      for (const entry of allJudgeEntries) {
        y = pdfCheckPage(doc, y, 7);
        if (rowIndex % 2 === 1) {
          doc.setFillColor(...PDF.ROW_ALT);
          doc.rect(M, y - 2, W - 2 * M, 6, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...PDF.INK);
        doc.text(entry.judgeName, M, y + 0.5);
        doc.text(entry.tipo, M + 80, y + 0.5);
        const scoreText = entry.voted ? String(Math.round(entry.sum)) : "—";
        doc.setTextColor(...(entry.voted ? PDF.INK : PDF.MUTED));
        doc.text(scoreText, M + 125, y + 0.5);
        const statusText = entry.voted ? "Votó" : "Pendiente";
        doc.setTextColor(...(entry.voted ? PDF.SUCCESS : PDF.WARNING));
        doc.setFont("helvetica", "bold");
        doc.text(statusText, col6X, y + 0.5, { align: "right" });
        y += 6;
        rowIndex++;
      }

      // Evaluación incompleta: mostrar jueces faltantes por tipo
      const expoMissing = r.expoTotal - r.expoVoted;
      const escritoMissing = r.escritoTotal - r.escritoVoted;
      const hasIncompleteExpo = !isFEA && r.expoTotal > 0 && expoMissing > 0;
      const hasIncompleteEscrito = !isFEA && r.escritoTotal > 0 && escritoMissing > 0;
      const hasIncompleteFEA = isFEA && r.expoTotal > 0 && expoMissing > 0;

      if (hasIncompleteExpo || hasIncompleteEscrito || hasIncompleteFEA) {
        const missingParts = [];
        if (hasIncompleteExpo) missingParts.push(`${expoMissing} juez${expoMissing !== 1 ? "es" : ""} de Exposición`);
        if (hasIncompleteEscrito) missingParts.push(`${escritoMissing} juez${escritoMissing !== 1 ? "es" : ""} de Escrito`);
        if (hasIncompleteFEA) missingParts.push(`${expoMissing} juez${expoMissing !== 1 ? "es" : ""} del FEA`);
        doc.setDrawColor(...PDF.WARNING);
        doc.setFillColor(255, 249, 237);
        doc.roundedRect(M, y - 1, W - 2 * M, 5.5, 1, 1, "FD");
        doc.setTextColor(...PDF.WARNING);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`Evaluación incompleta — Faltan: ${missingParts.join(", ")}`, M + 3, y + 2.5);
        y += 7;
      }

      // Totals for this project
      doc.setDrawColor(...PDF.BORDER);
      doc.setLineWidth(0.4);
      doc.line(M, y, W - M, y);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF.PRIMARY);
      const expoMax = getMaxScoreForProject(r.projectId, "Exposición");
      const escritoMax = getMaxScoreForProject(r.projectId, "Escrito");
      const expoAvgRound = r.expoJudges.length ? Math.round(r.expoJudges.reduce((s, j) => s + j.sum, 0) / r.expoJudges.length) : 0;
      const escritoAvgRound = r.escritoJudges.length ? Math.round(r.escritoJudges.reduce((s, j) => s + j.sum, 0) / r.escritoJudges.length) : 0;
      const finalDisplay = r.evalComplete ? `${Math.round(r.finalScore)} pts` : "N/A";

      if (isFEA) {
        doc.text(`Puntaje: ${expoAvgRound}/${expoMax}`, M, y + 0.5);
      } else {
        doc.text(`Expo: ${expoAvgRound}/${expoMax} | Escrito: ${escritoAvgRound}/${escritoMax} | Final: ${finalDisplay}`, M, y + 0.5);
      }
      y += 8;

      // Separador visual entre proyectos
      if (results.indexOf(r) < results.length - 1) {
        doc.setDrawColor(...PDF.BORDER);
        doc.setLineWidth(0.6);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(M, y + 2, W - M, y + 2);
        doc.setLineDashPattern([], 0);
        y += 5;
      }
    }

    // === Summary ===
    y = pdfCheckPage(doc, y, 30);
    y = pdfSubHeader(doc, "Resumen general", y);
    const totalExpoVotes = results.reduce((s, r) => s + r.expoVoted, 0);
    const totalExpoAssigned = results.reduce((s, r) => s + r.expoTotal, 0);
    const totalEscritoVotes = results.reduce((s, r) => s + r.escritoVoted, 0);
    const totalEscritoAssigned = results.reduce((s, r) => s + r.escritoTotal, 0);
    const totalVotes = totalExpoVotes + totalEscritoVotes;
    const totalAssigned = totalExpoAssigned + totalEscritoAssigned;
    const pctVotacion = totalAssigned > 0 ? Math.round(totalVotes / totalAssigned * 100) : 0;
    const completedCount = results.filter(r => r.evalComplete).length;
    const pctCompletos = results.length > 0 ? Math.round(completedCount / results.length * 100) : 0;
    const summaryLines = [
      `Total proyectos: ${results.length} (${completedCount} con evaluación completa, ${pctCompletos}%)`,
      ...(isFEA
        ? [`• Evaluados: ${totalExpoVotes} de ${totalExpoAssigned} asignaciones completadas`]
        : [
            `• Expo: ${totalExpoVotes} de ${totalExpoAssigned} asignaciones completadas`,
            `• Escrito: ${totalEscritoVotes} de ${totalEscritoAssigned} asignaciones completadas`
          ]
      ),
      `• Total: ${totalVotes} de ${totalAssigned} evaluaciones finalizadas (${pctVotacion}%)`,
      `Proyecto lider: ${results[0]?.projectName ?? "N/A"} — ${results[0]?.evalComplete ? Math.round(results[0].finalScore) + " pts" : "N/A (incompleto)"}`
    ];
    const summaryW = W - 2 * M;
    const summaryBoxH = summaryLines.length * 7 + 14;
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.setDrawColor(...PDF.GOLD);
    doc.roundedRect(M, y, summaryW, summaryBoxH, 2.5, 2.5, "FD");
    doc.setTextColor(...PDF.PRIMARY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    summaryLines.forEach((line, i) => {
      doc.text(line, M + 5, y + 7 + i * 7);
    });

    pdfFooter(doc, now);
    const fileName = selectedFeria
      ? `resultados_${selectedFeria.replace(/\s+/g, "_")}.pdf`
      : "resultados_generales.pdf";
    doc.save(fileName);
    showToast("PDF exportado correctamente.", "success");
  } catch (err) {
    console.error("Error generating admin PDF:", err);
    showToast("No se pudo generar el PDF. Revisa la conexion e intenta de nuevo.", "error");
  }
}
