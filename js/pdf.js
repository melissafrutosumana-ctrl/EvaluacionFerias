import { supabase } from "./supabase.js?v=4";
import { showToast, FESTIVAL_FERIA_NAME, PRONAFECYT_CODE_MAX, PRONAFECYT_C_RAW_MAX, getFestivalProjectLabel, getResultCategoryGroupLabel, calcAverage, calcFinalScore, calcPronatecytFinalScore, calcExpotecnicaFinalScore, getEvaluationStatus, isEvaluationComplete, sortEvaluationResults } from "./utils.js?v=16.17";
import { getExpotecnicaRubricByCategory, getFestivalRubricBySubcategory } from "./rubrics.js?v=2.1";
import { loadUsers, fetchAllEvaluations, fetchAllRpc } from "./data.js?v=3.34";

let jspdfPromise = null;

export function loadJSPDF() {
    if (window.jspdf ?.jsPDF) return Promise.resolve();
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "/vendor/pdf/jspdf-4.2.1.umd.min.js";
        s.onload = () => {
            if (window.jspdf ?.jsPDF) resolve();
            else reject(new Error("jsPDF not found after load"));
        };
        s.onerror = () => reject(new Error("Failed to load jspdf library"));
        document.head.appendChild(s);
    });
    return jspdfPromise;
}

let autoTablePromise = null;

function hasAutoTable() {
    const jsPDF = window.jspdf?.jsPDF;
    return typeof jsPDF?.API?.autoTable === "function" || typeof jsPDF?.prototype?.autoTable === "function";
}

export function loadAutoTable() {
    if (hasAutoTable()) return Promise.resolve();
    if (autoTablePromise) return autoTablePromise;

    autoTablePromise = new Promise((resolve, reject) => {
        const script = document.querySelector("script[data-autotable]") ?? document.createElement("script");
        const finish = () => {
            script.dataset.autotableStatus = "loaded";
            if (hasAutoTable()) {
                resolve();
            } else {
                reject(new Error("jspdf-autotable cargo, pero no se conecto a jsPDF"));
            }
        };

        if (script.dataset.autotableStatus === "loaded") {
            finish();
            return;
        }

        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", () => {
            script.dataset.autotableStatus = "error";
            reject(new Error("Failed to load jspdf-autotable"));
        }, { once: true });

        if (!script.parentNode) {
            script.dataset.autotable = "1";
            script.dataset.autotableStatus = "loading";
            script.src = "/vendor/pdf/jspdf-autotable-5.0.8.min.js";
            document.head.appendChild(script);
        } else if (hasAutoTable()) {
            finish();
        } else if (script.dataset.autotableStatus === "error") {
            reject(new Error("Failed to load jspdf-autotable"));
        }
    });
    return autoTablePromise;
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
    MARGIN: 10,
    PAGE_W: 210,
    PAGE_H: 297,
    PAGE_LIMIT: 270,
    PRIMARY: [13, 42, 91],
    GOLD: [201, 168, 106],
    GOLD_DARK: [176, 142, 78],
    GOLD_LIGHT: [253, 251, 247],
    INK: [15, 23, 42],
    INK_LIGHT: [51, 65, 85],
    MUTED: [100, 116, 139],
    MUTED_LIGHT: [148, 163, 184],
    BORDER: [226, 232, 240],
    BORDER_STRONG: [203, 213, 225],
    ROW_ALT: [248, 250, 252],
    SURFACE: [255, 255, 255],
    SUCCESS: [22, 163, 74],
    WARNING: [217, 119, 6],
    WHITE: [255, 255, 255],
};

export function pdfHeader(doc, title, logoDataUrl) {
    doc.__reportTitle = title;
    let y = 10;
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y, PDF.PAGE_W - 2 * PDF.MARGIN, 23, 3, 3, "F");
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.6);
    doc.line(PDF.MARGIN + 4, y + 19, PDF.PAGE_W - PDF.MARGIN - 4, y + 19);
    const logoX = PDF.MARGIN + 5;
    if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", logoX, y + 3.5, 38, 15); } catch (e) { console.warn("Error logo", e); }
        // si hay logo, texto a la derecha
        const tx = PDF.MARGIN + 49;
        doc.setTextColor(...PDF.GOLD);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.text("REPÚBLICA DE COSTA RICA", tx, y + 7.5);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.2);
        doc.text("Ministerio de Educación Pública", tx, y + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.8);
        doc.setTextColor(200, 215, 235);
        doc.text("Dirección Regional Pacífico Central · Evaluación de Ferias", tx, y + 17.5);
    } else {
        doc.setTextColor(...PDF.GOLD);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.text("REPÚBLICA DE COSTA RICA", PDF.MARGIN + 6, y + 7.5);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.2);
        doc.text("Ministerio de Educación Pública", PDF.MARGIN + 6, y + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.8);
        doc.setTextColor(200, 215, 235);
        doc.text("Dirección Regional Pacífico Central · Evaluación de Ferias", PDF.MARGIN + 6, y + 17.5);
    }
    y += 29;
    doc.setTextColor(...PDF.PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, PDF.MARGIN, y);
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.6);
    doc.line(PDF.MARGIN, y + 2.2, PDF.MARGIN + 36, y + 2.2);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...PDF.MUTED);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-CR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${new Date().toLocaleTimeString("es-CR")}`, PDF.MARGIN, y);
    y += 7;
    return y;
}

export function pdfFooter(doc, now) {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const fy = doc.internal.pageSize.height - 8;
        doc.setDrawColor(...PDF.GOLD);
        doc.setLineWidth(0.35);
        doc.line(PDF.MARGIN, fy - 4, PDF.PAGE_W - PDF.MARGIN, fy - 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.8);
        doc.setTextColor(...PDF.MUTED_LIGHT);
        doc.text("Sistema de Evaluación de Ferias  ·  MEP  ·  Documento oficial de uso interno", PDF.MARGIN, fy);
        doc.setFontSize(5.5);
        doc.text(`Generado ${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR")}`, PDF.MARGIN, fy + 3.2);
        const pillW = 16;
        const pillX = PDF.PAGE_W - PDF.MARGIN - pillW;
        doc.setFillColor(...PDF.PRIMARY);
        doc.roundedRect(pillX, fy - 6.2, pillW, 5, 1.8, 1.8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.text(`${i}/${pages}`, pillX + pillW / 2, fy - 2.7, { align: "center" });
    }
}

export function pdfContinuationHeader(doc) {
    const title = doc.__reportTitle ?? "Reporte institucional";
    const x = PDF.MARGIN;
    const y = 7;
    const w = PDF.PAGE_W - 2 * PDF.MARGIN;
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(x, y, w, 13, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...PDF.WHITE);
    doc.text("MINISTERIO DE EDUCACIÓN PÚBLICA · DIRECCIÓN REGIONAL PACÍFICO CENTRAL", x + 3, y + 7.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(210, 224, 240);
    doc.text(title, PDF.PAGE_W - PDF.MARGIN - 3, y + 7.2, { align: "right" });
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.45);
    doc.line(x + 2, y + 15.5, PDF.PAGE_W - PDF.MARGIN - 2, y + 15.5);
}

export function pdfNewPage(doc) {
    doc.addPage();
    doc.setFillColor(253, 253, 253);
    doc.rect(0, 0, PDF.PAGE_W, PDF.PAGE_H, "F");
    pdfContinuationHeader(doc);
    return PDF.MARGIN + 13;
}

export function pdfInfoBox(doc, lines, y) {
    const boxW = PDF.PAGE_W - 2 * PDF.MARGIN;
    const labelW = 42;
    const entries = lines.map((line) => {
        const sep = line.indexOf(":");
        const label = sep > 0 ? line.slice(0, sep + 1) : "";
        const value = sep > 0 ? line.slice(sep + 1).trim() : line;
        doc.setFont("helvetica", sep > 0 ? "bold" : "normal");
        doc.setFontSize(sep > 0 ? 7.2 : 7);
        return { label, value, lines: doc.splitTextToSize(value, boxW - (sep > 0 ? labelW + 10 : 10)) };
    });
    const boxH = entries.reduce((sum, entry) => sum + Math.max(5.2, entry.lines.length * 3.8), 0) + 10;
    y = pdfCheckPage(doc, y, boxH + 4);
    doc.setFillColor(...PDF.ROW_ALT);
    doc.setDrawColor(...PDF.BORDER);
    doc.roundedRect(PDF.MARGIN, y, boxW, boxH, 2.2, 2.2, "FD");
    doc.setFillColor(...PDF.GOLD);
    doc.roundedRect(PDF.MARGIN, y, 2.2, boxH, 0.6, 0.6, "F");
    let ly = y + 6;
    entries.forEach((entry) => {
        if (entry.label) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6);
            doc.setTextColor(...PDF.MUTED);
            doc.text(entry.label.toUpperCase(), PDF.MARGIN + 5, ly);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(...PDF.INK);
            doc.text(entry.lines, PDF.MARGIN + labelW + 5, ly);
        } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...PDF.MUTED);
            doc.text(entry.lines, PDF.MARGIN + 5, ly);
        }
        ly += Math.max(5.2, entry.lines.length * 3.8);
    });
    return y + boxH + 6;
}

export function pdfProjectHeader(doc, titulo, y) {
    const maxW = PDF.PAGE_W - 2 * PDF.MARGIN - 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(titulo, maxW);
    const display = lines.length > 2 ? [lines[0], lines[1].slice(0, -3) + "…"] : lines;
    const boxH = Math.max(10, display.length * 4.8 + 6);
    doc.setFillColor(...PDF.PRIMARY);
    doc.setDrawColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y, PDF.PAGE_W - 2 * PDF.MARGIN, boxH, 2, 2, "F");
    // ID badge placeholder (no ID here, solo decorativo)
    doc.setFillColor(...PDF.GOLD);
    doc.roundedRect(PDF.MARGIN + PDF.PAGE_W - 2 * PDF.MARGIN - 18, y + 2, 14, 5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("PROYECTO", PDF.MARGIN + PDF.PAGE_W - 2 * PDF.MARGIN - 11, y + 5.3, { align: "center" });
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(display.length > 1 ? 7 : 8);
    doc.text(display, PDF.MARGIN + 3, y + (display.length > 1 ? 5 : 6.5));
    return y + boxH + 3;
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
    if (y + (needed || 22) > PDF.PAGE_LIMIT) {
        return pdfNewPage(doc);
    }
    return y;
}

export function pdfSignatureBlock(doc, y, labels = ["Firma", "Nombre y cargo"]) {
    const blockH = 42;
    y = pdfCheckPage(doc, y, blockH);
    const gap = 12;
    const colW = (PDF.PAGE_W - 2 * PDF.MARGIN - gap) / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("VALIDACIÓN Y FIRMAS", PDF.MARGIN, y + 5);
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.5);
    doc.line(PDF.MARGIN, y + 7, PDF.MARGIN + 28, y + 7);
    const lineY = y + 32;
    labels.forEach((label, i) => {
        const x = PDF.MARGIN + i * (colW + gap);
        doc.setDrawColor(...PDF.INK);
        doc.setLineWidth(0.35);
        doc.line(x, lineY, x + colW, lineY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(...PDF.INK_LIGHT);
        doc.text(label.toUpperCase(), x + colW / 2, lineY + 5, { align: "center" });
    });
    return lineY + 12;
}


export async function generateJudgePDF(user) {
    await loadJSPDF();
    await loadAutoTable();
    const logoData = await loadMEPLogo();
    const [evalResult, projectsData] = await Promise.all([
        fetchAllRpc("get_judge_evaluations_with_titles"),
        fetchAllRpc("get_judge_projects")
    ]);
    const data = evalResult;
    if (!data || !data.length) {
        showToast("No tienes evaluaciones guardadas para exportar.", "info");
        return;
    }
    const projectsMap = new Map(projectsData.map((p) => [p.id, p]));
    const uniqueCombos = new Map();
    data.forEach((item) => {
        const pid = Number(item.proyecto_id);
        const tipo = item.tipo_evaluacion ?? "Exposición";
        const key = `${pid}-${tipo}`;
        if (!uniqueCombos.has(key)) uniqueCombos.set(key, { pid, tipo });
    });
    const obsResults = await Promise.all(
        [...uniqueCombos.values()].map((c) =>
            supabase.rpc("get_judge_observation", {
                p_project_id: c.pid,
                p_tipo_evaluacion: c.tipo
            }).then((r) => ({ key: `${c.pid}-${c.tipo}`, data: r.data, error: r.error }))
        )
    );
    const obsMap = new Map();
    obsResults.forEach((o) => {
        if (o.error) throw new Error("No se pudieron cargar las observaciones de las evaluaciones.");
        if (o.data && o.data.length) obsMap.set(o.key, o.data[0]?.texto ?? "");
    });
    const grouped = new Map();
    data.forEach((item) => {
        const pid = Number(item.proyecto_id);
        const tipo = item.tipo_evaluacion ?? "Exposición";
        const key = `${pid}-${tipo}`;
        if (!grouped.has(key)) {
            const proj = projectsMap.get(pid);
            const titulo = item.titulo || item.proyectos_ferias?.titulo || proj?.titulo || `Proyecto #${pid}`;
            grouped.set(key, { projectId: pid, titulo, tipo, projectData: proj ?? null, items: [], total: 0, observacion: obsMap.get(key) ?? "" });
        }
        const g = grouped.get(key);
        g.items.push({ criterio: item.criterio, nota: Number(item.nota || 0) });
        g.total += Number(item.nota || 0);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFillColor(253, 253, 253);
    doc.rect(0, 0, PDF.PAGE_W, PDF.PAGE_H, "F");
    const now = new Date();
    const M = PDF.MARGIN, W = PDF.PAGE_W;
    let y = pdfHeader(doc, "Reporte de Evaluaciones", logoData);
    const evaluatedProjectCount = new Set([...grouped.values()].map((group) => group.projectId)).size;

    const infoLines = [
        `Juez: ${user.nombre}`,
        `Fecha: ${now.toLocaleDateString("es-CR")}`,
        `Hora: ${now.toLocaleTimeString("es-CR")}`,
        user.tipo_feria ? `Feria: ${user.tipo_feria}` : "",
        `Proyectos evaluados: ${evaluatedProjectCount}`,
    ].filter(Boolean);
    y = pdfInfoBox(doc, infoLines, y);

    // Resumen premium con autoTable (paginación automática, sin cortes)
    y = pdfSubHeader(doc, "Resumen — Puntajes por proyecto", y);
    const tableW = W - 2 * M;
    // Pre-calcula grandTotal para total general
    let grandTotal = 0;
    for (const [, g] of grouped) grandTotal += g.total;
    const resumenBody = [...grouped.values()].map(g => {
        const p = g.projectData;
        const classification = p?.tipo_feria === "Feria Expotecnica"
            ? [p.categoria_expotecnica, p.eje_tematico].filter(Boolean).join(" · ")
            : p?.tipo_feria === "Feria Cientifica y Tecnologica"
                ? [p.categoria_pronatecyt, p.nivel_educativo].filter(Boolean).join(" · ")
                : p?.tipo_feria === "Festival Estudiantil de las Artes"
                    ? getFestivalProjectLabel(p, true) || p.categoria_festival || ""
                    : p?.tipo_feria || "";
        return [String(g.projectId), [g.titulo, classification].filter(Boolean).join("\n"), g.tipo === "Escrito" ? "ESCRITO" : "EXPO", String(g.items.length), String(g.total)];
    });
    doc.autoTable({
        startY: y,
        head: [["ID", "PROYECTO / CATEGORÍA", "TIPO", "CRIT.", "PUNTAJE"]],
        body: resumenBody,
        theme: "plain",
        margin: { left: M, right: M },
        headStyles: { fillColor: PDF.PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 6.3, halign: "center", valign: "middle", cellPadding: {top:2,bottom:2,left:2,right:2} },
        columnStyles: {
            0: { cellWidth: 12, halign: "center", fontStyle: "bold", fontSize: 6.4, textColor: PDF.PRIMARY },
            1: { cellWidth: tableW - 12 - 20 - 16 - 22, fontStyle: "bold", fontSize: 6.8, textColor: PDF.INK, cellPadding: {top:1.6,bottom:1.6,left:2,right:2} },
            2: { cellWidth: 20, halign: "center", fontSize: 5.5, textColor: PDF.MUTED },
            3: { cellWidth: 16, halign: "center", fontSize: 6.8, textColor: PDF.MUTED },
            4: { cellWidth: 22, halign: "center", fontStyle: "bold", fontSize: 8, textColor: PDF.PRIMARY }
        },
        styles: { font: "helvetica", fontSize: 6.8, cellPadding: 1.6, textColor: PDF.INK_LIGHT, lineColor: PDF.BORDER, lineWidth: 0.18, valign: "middle", overflow: "linebreak" },
        alternateRowStyles: { fillColor: PDF.ROW_ALT },
        didParseCell: function(data){
            if (data.column.index === 0) data.cell.styles.halign = "center";
            if(data.section==='head'){
                data.cell.styles.fillColor = PDF.PRIMARY;
                data.cell.styles.textColor = 255;
            }
        },
        didDrawPage: function(_data){
            // footer is handled globally, but ensure y is updated
        }
    });
    y = doc.lastAutoTable.finalY + 4;
    // Total general con autoTable footer
    y = pdfCheckPage(doc, y, 12);
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.setDrawColor(...PDF.GOLD);
    doc.roundedRect(M, y, tableW, 9, 1.6, 1.6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("TOTAL GENERAL", M + 4, y + 6);
    doc.setFontSize(11);
    doc.text(`${grandTotal} pts`, W - M - 4, y + 6, { align: "right" });
    y = doc.lastAutoTable.finalY + 18; // approx after total
    // y ya está en doc.lastAutoTable.finalY+4, pero ajustamos
    y = Math.max(y, doc.lastAutoTable.finalY + 15);

    // El detalle es una sección larga: empieza completa en una página nueva.
    y = pdfNewPage(doc);
    y = pdfSubHeader(doc, "Detalle por proyecto", y);
    function getJudgeMax(pd, tipo, cnt) {
        if (!pd) return cnt * 3;
        const feria = pd.tipo_feria ?? "";
        if (feria === "Feria Cientifica y Tecnologica") {
            let code = String(pd.categoria_pronatecyt || "").split(" ")[0];
            if (tipo === "Escrito") code = code.replace("B", "C");
            return PRONAFECYT_CODE_MAX[code] || cnt * 3;
        }
        if (feria === "Feria Expotecnica") {
            const cat = pd.categoria_expotecnica ?? "";
            const rub = getExpotecnicaRubricByCategory(cat, tipo);
            if (rub?.sections) {
                const c = rub.sections.reduce((s, sec) => s + sec.indicators.length, 0);
                if (c) return c * 3;
            }
            return cnt * 3;
        }
        return cnt * 3;
    }
    for (const [, g] of grouped) {
        const catText = (() => {
            const p = g.projectData; if (!p) return "";
            if (p.tipo_feria === "Feria Expotecnica" && p.categoria_expotecnica) return p.eje_tematico ? `${p.categoria_expotecnica} — ${p.eje_tematico}` : p.categoria_expotecnica;
            if (p.tipo_feria === "Feria Cientifica y Tecnologica" && p.categoria_pronatecyt) return `${p.tipo_feria} · ${p.categoria_pronatecyt} · ${p.nivel_educativo || ""}`.trim();
            if (p.tipo_feria === "Festival Estudiantil de las Artes") return getFestivalProjectLabel(p, true) || p.categoria_festival;
            return p.tipo_feria || "";
        })();
        const innerW = tableW - 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        const tipoTmpW = doc.getTextWidth(g.tipo.toUpperCase()) + 8;
        const idBadge = `ID ${g.projectId}`;
        const idBadgeW = Math.max(14, doc.getTextWidth(idBadge) + 5);
        const hdrWidth = innerW - idBadgeW - tipoTmpW - 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const hdrLines = doc.splitTextToSize(g.titulo, hdrWidth);
        const hdrH = Math.max(12, hdrLines.length * 3.7 + 6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.2);
        const catLines = catText ? doc.splitTextToSize(catText, innerW - 10) : [];
        const catBoxH = catText ? Math.max(7.2, catLines.length * 3.4 + 4.8) : 0;
        const catH = catText ? catBoxH + 4 : 0;
        // Use autoTable for criteria to get perfect pagination
        const bodyForAuto = g.items.map(it => [it.criterio, String(it.nota)]);
        const obsLines = g.observacion ? doc.splitTextToSize(g.observacion, innerW - 6) : [];
        const obsH = g.observacion ? Math.max(16, obsLines.length * 3.8 + 14) : 0;
        const blockH = hdrH + catH + 7 + (bodyForAuto.length * 7) + 10 + obsH + 10;
        if (blockH < PDF.PAGE_LIMIT - PDF.MARGIN * 2 && y + blockH > PDF.PAGE_LIMIT) {
            y = pdfNewPage(doc);
        }
        const cardX = M, cardW = tableW;
        doc.setFillColor(...PDF.PRIMARY);
        doc.roundedRect(cardX, y, cardW, hdrH, 2, 2, "F");
        const tipoBadge = g.tipo.toUpperCase();
        const tipoW = doc.getTextWidth(tipoBadge) + 8;
        doc.setFillColor(...PDF.GOLD);
        doc.roundedRect(cardX + cardW - idBadgeW - 4, y + 2, idBadgeW, 5, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(idBadge, cardX + cardW - idBadgeW / 2 - 4, y + 5.3, { align: "center" });
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF.GOLD);
        doc.roundedRect(cardX + cardW - idBadgeW - tipoW - 8, y + 2, tipoW, 5, 1.5, 1.5, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(tipoBadge, cardX + cardW - 18 - tipoW / 2 - 4, y + 5.3, { align: "center" });
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.text(hdrLines, cardX + 3, y + 5);
        y += hdrH + 2;
        if (catText) {
            y = pdfCheckPage(doc, y, catBoxH + 2);
            doc.setFillColor(...PDF.GOLD_LIGHT);
            doc.setDrawColor(...PDF.GOLD);
            doc.roundedRect(cardX + 2, y, cardW - 4, catBoxH, 1.3, 1.3, "FD");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(6.2);
            doc.setTextColor(...PDF.MUTED);
            doc.text(catLines, cardX + 5, y + (catLines.length === 1 ? 4.6 : 4.1));
            y += catBoxH + 4;
        }
        // Use autoTable for criterios - FIX 2: cellWidth explícito + overflow linebreak + margin.bottom
        doc.autoTable({
            startY: y,
            head: [["CRITERIO DE EVALUACIÓN", "NOTA"]],
            body: bodyForAuto,
            theme: "plain",
            margin: { left: M + 2, right: M + 2, bottom: 15 },
            headStyles: { fillColor: PDF.BORDER, textColor: PDF.MUTED, fontStyle: "bold", fontSize: 5.8, halign: "left", cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: innerW - 12, fontSize: 6.8, textColor: PDF.INK_LIGHT, cellPadding: {top:1.5,bottom:1.5,left:2,right:2}, overflow: "linebreak" },
                1: { cellWidth: 14, halign: "center", fontStyle: "bold", fontSize: 7, textColor: PDF.INK, overflow: "linebreak" }
            },
            styles: { font: "helvetica", fontSize: 6.8, cellPadding: 2, lineColor: PDF.BORDER, lineWidth: 0.12, valign: "middle", overflow: "linebreak", minCellHeight: 0 },
            alternateRowStyles: { fillColor: PDF.ROW_ALT },
            // FIX 3: Detectar contenido largo y reducir fontSize solo para esa celda (ej. Observación)
            didParseCell: function(data){
                if(data.section === 'head'){
                    data.cell.styles.fillColor = PDF.PRIMARY;
                    data.cell.styles.textColor = 255;
                }
                if(data.section === 'body' && data.column.index === 0){
                    const txt = (data.cell.text || []).join(" ");
                    if(txt.length > 280) data.cell.styles.fontSize = 6;
                    if(txt.length > 450) data.cell.styles.fontSize = 5.5;
                }
            },
            didDrawCell: function(data){
                if(data.section === 'body' && data.column.index === 1){
                    const nota = Number(data.cell.text[0]);
                    const pal = nota===3 ? [[220,252,231],[34,197,94],[22,101,52]] : nota===2 ? [[254,249,195],[234,179,8],[113,63,18]] : nota===1 ? [[255,237,213],[249,115,22],[154,52,18]] : [[254,226,226],[239,68,68],[153,27,27]];
                    const x = data.cell.x, yCell = data.cell.y, w = data.cell.width, h = data.cell.height;
                    // draw pill behind text
                    doc.setFillColor(...pal[0]);
                    doc.setDrawColor(...pal[1]);
                    const pillW = 11, pillH = 5, pillX = x + w/2 - pillW/2, pillY = yCell + h/2 - pillH/2;
                    doc.roundedRect(pillX, pillY, pillW, pillH, 2,2,"FD");
                    doc.setFont("helvetica","bold");
                    doc.setTextColor(...pal[2]);
                    doc.setFontSize(7);
                    doc.text(String(nota), x + w/2, yCell + h/2 + 1.2, {align:"center"});
                    // prevent default text
                    data.cell.text = [""];
                }
            }
        });
        y = doc.lastAutoTable.finalY + 3;
        doc.setDrawColor(...PDF.GOLD);
        doc.setLineWidth(0.28);
        doc.line(M + 2, y, M + tableW - 2, y);
        y += 3.5;
        const max = getJudgeMax(g.projectData, g.tipo, g.items.length);
        const pct = max ? Math.round(g.total / max * 100) : 0;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(`Total  ${g.total} / ${max}  ·  ${pct}%`, M + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.8);
        doc.setTextColor(...PDF.MUTED_LIGHT);
        doc.text(`${g.items.length} criterios · ${g.tipo}`, M + tableW - 2, y, { align: "right" });
        y += 4.5;
        if (g.observacion) {
            // FIX 1: Observación suelta con doc.text -> usar splitTextToSize + cálculo de altura + salto de página
            // Se calcula ANTES de dibujar el rect, y se fuerza addPage si no cabe
            let obsFontSize = 6.5;
            // FIX 3: Si observación muy larga (>280 chars), reducir fontSize dinámicamente solo para esta caja
            if (g.observacion.length > 280) obsFontSize = 6;
            if (g.observacion.length > 450) obsFontSize = 5.5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(obsFontSize);
            // FIX crítico: usar el lineHeight REAL que jsPDF usará en doc.text(array)
            // doc.getLineHeight() = fontSize * lineHeightFactor (pt), / scaleFactor (2.83 para mm) = mm
            const realLineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
            const oLines = doc.splitTextToSize(g.observacion, innerW - 6);
            const oh = Math.max(16, oLines.length * realLineHeight + 14);
            // Si no cabe en la página actual, saltar ANTES de dibujar el rect
            y = pdfCheckPage(doc, y, oh + 6);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...PDF.BORDER_STRONG);
            doc.roundedRect(M + 2, y, tableW - 4, oh, 1.4, 1.4, "FD");
            doc.setFillColor(...PDF.GOLD);
            doc.roundedRect(M + 2, y, 2.3, oh, 0.5, 0.5, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.2);
            doc.setTextColor(...PDF.PRIMARY);
            const observationLabel = `Observación · ${g.titulo} · ID ${g.projectId} · ${g.tipo}`;
            doc.text(doc.splitTextToSize(observationLabel, innerW - 12), M + 6, y + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(obsFontSize);
            doc.setTextColor(...PDF.INK_LIGHT);
            doc.text(oLines, M + 6, y + 10);
            y += oh + 4;
        }
        y += 6;
    }
    y = pdfCheckPage(doc, y, 14);
    doc.setFillColor(...PDF.ROW_ALT);
    doc.setDrawColor(...PDF.BORDER);
    doc.roundedRect(M, y, tableW, 12, 2, 2, "FD");
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(M + 1, y + 1, tableW - 2, 10, 1.4, 1.4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PUNTAJE TOTAL ACUMULADO", M + 4, y + 7.2);
    doc.setTextColor(...PDF.GOLD);
    doc.setFontSize(12);
    doc.text(`${grandTotal} pts`, W - M - 4, y + 7.5, { align: "right" });
    y += 18;
    y = pdfSignatureBlock(doc, y, ["Firma del juez", "Nombre y cargo"]);
    pdfFooter(doc, now);
    doc.save(`evaluaciones_${user.nombre.replace(/\s+/g, "_")}.pdf`);
}


export function pdfSubHeader(doc, title, y) {
  y = pdfCheckPage(doc, y, 12);
  doc.setDrawColor(...PDF.BORDER);
  doc.setLineWidth(0.18);
  doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text(title.toUpperCase(), PDF.MARGIN, y);
  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.55);
  doc.line(PDF.MARGIN, y + 1.3, PDF.MARGIN + 14, y + 1.3);
  y += 7;
  return y;
}


function pdfResultsTableHeader(doc, y) {
  const M = PDF.MARGIN, W = PDF.PAGE_W, headerH = 7;
  y = pdfCheckPage(doc, y, headerH + 2);
  doc.setFillColor(...PDF.PRIMARY);
  doc.roundedRect(M, y, W - 2 * M, headerH, 1.6, 1.6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("ID", M + 8, y + 4.5, { align: "center" });
  doc.text("PROYECTO", M + 18, y + 4.5);
  doc.text("PUNTAJE FINAL", M + W - 2 * M - 30, y + 4.5, { align: "center" });
  doc.text("ESTADO", M + W - 2 * M - 4, y + 4.5, { align: "right" });
  return y + headerH + 2;
}

export async function generateAdminPDF() {
  await loadJSPDF();
  const logoData = await loadMEPLogo();
  try {
    const [users, projectsResult, evaluations, assignmentsResult, observationsResult] = await Promise.all([
      loadUsers(),
      fetchAllRpc("get_projects"),
      fetchAllEvaluations(),
      fetchAllRpc("get_assignments"),
      fetchAllRpc("get_observations")
    ]);
    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";
    const selectedDate = document.querySelector("[data-results-date-filter]")?.value ?? "";
    const allProjects = projectsResult ?? [];
    const filteredProjects = allProjects.filter((project) =>
      (!selectedFeria || project.tipo_feria === selectedFeria) &&
      (!selectedDate || project.fecha_evaluacion === selectedDate)
    );
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
    const filteredEvals = (evaluations ?? []).filter((r) => projectIds.has(r.proyecto_id));
    const observationsByAssignment = new Map();
    (observationsResult ?? []).forEach((observation) => {
      const projectId = Number(observation.proyecto_id);
      const judgeId = Number(observation.juez_id);
      const text = String(observation.texto ?? "");
      if (!projectIds.has(projectId) || !text.trim()) return;
      const tipo = observation.tipo_evaluacion ?? "Exposición";
      const key = `${projectId}-${judgeId}-${tipo}`;
      const texts = observationsByAssignment.get(key) ?? [];
      texts.push(text);
      observationsByAssignment.set(key, texts);
    });
    if (!filteredProjects.length) {
      showToast("No hay proyectos para generar el reporte con esos filtros.", "info");
      return;
    }
    const votedSet = new Set();
    const scoreMap = new Map();
    filteredEvals.forEach((row) => {
      const tipo = row.tipo_evaluacion ?? "Exposición";
      const key = `${row.proyecto_id}-${row.juez_id}-${tipo}`;
      votedSet.add(key);
      const nota = Number(row.nota);
      if (!Number.isNaN(nota)) scoreMap.set(key, (scoreMap.get(key) || 0) + nota);
    });
    const assignmentsByProject = new Map();
    assignmentsResult.forEach((a) => {
      if (projectIds.has(a.proyecto_id)) {
        if (!assignmentsByProject.has(a.proyecto_id)) assignmentsByProject.set(a.proyecto_id, []);
        assignmentsByProject.get(a.proyecto_id).push({ juez_id: a.juez_id, tipo_evaluacion: a.tipo_evaluacion ?? "Exposición", judgeName: usersById?.get(a.juez_id)?.nombre ?? `Juez #${a.juez_id}` });
      }
    });
    const results = [];
    for (const [projectId, projData] of projectsById) {
      const assignedJudges = assignmentsByProject.get(projectId) ?? [];
      const expoJudges = [], escritoJudges = [];
      let expoVoted = 0, expoTotal = 0, escritoVoted = 0, escritoTotal = 0;
      assignedJudges.forEach((aj) => {
        const tipo = aj.tipo_evaluacion ?? "Exposición";
        const key = `${projectId}-${aj.juez_id}-${tipo}`;
        const voted = votedSet.has(key);
        const observationKey = `${Number(projectId)}-${Number(aj.juez_id)}-${aj.tipo_evaluacion ?? "Exposición"}`;
        const entry = {
          judgeId: aj.juez_id,
          judgeName: aj.judgeName,
          sum: scoreMap.get(key) || 0,
          voted,
          observation: (observationsByAssignment.get(observationKey) ?? []).join("\n\n")
        };
        if (aj.tipo_evaluacion === "Escrito") { escritoJudges.push(entry); escritoTotal++; if (voted) escritoVoted++; } else { expoJudges.push(entry); expoTotal++; if (voted) expoVoted++; }
      });
      const expoAvg = calcAverage(expoJudges);
      const escritoAvg = calcAverage(escritoJudges);
      const manualWrittenMax = projData?.tipo_feria === "Feria Cientifica y Tecnologica"
        ? PRONAFECYT_C_RAW_MAX[String(projData.categoria_pronatecyt || "").split(" ")[0].replace("B", "C")] || 0
        : projData?.tipo_feria === "Feria Expotecnica"
          ? ({ "DESAFIO STEAM": 105, "EMPRENDIMIENTO E INNOVACION": 72 }[projData.categoria_expotecnica] || 0)
          : 0;
      const manualEscrito = manualWrittenMax > 0 && projData?.puntaje_escrito_manual != null ? Number(projData.puntaje_escrito_manual) : null;
      const escritoAvgFinal = manualEscrito !== null ? manualEscrito : escritoAvg;
      const escritoVotedFinal = manualEscrito !== null ? 1 : escritoVoted;
      const evaluationComplete = isEvaluationComplete({ expoTotal, expoVoted, escritoTotal, escritoVoted, manualEscrito });
      let pdfFinalScore = 0;
      if (evaluationComplete) {
        const bCode = String(projData?.categoria_pronatecyt || "").split(" ")[0];
        if (projData?.tipo_feria === "Feria Cientifica y Tecnologica") {
          const expoPts = expoAvg; const escritoPts = manualEscrito !== null ? manualEscrito : escritoAvg;
          pdfFinalScore = calcPronatecytFinalScore(bCode, expoPts, escritoPts);
        } else if (projData?.tipo_feria === "Feria Expotecnica") {
          const expoPts = expoAvg; const escritoPts = manualEscrito !== null ? manualEscrito : escritoAvg;
          pdfFinalScore = calcExpotecnicaFinalScore(projData?.categoria_expotecnica, expoPts, escritoPts);
        } else if (manualEscrito !== null) {
          pdfFinalScore = expoVoted > 0 ? expoAvg + manualEscrito : manualEscrito;
        } else {
          pdfFinalScore = calcFinalScore(expoVoted, expoAvg, escritoVotedFinal, escritoAvgFinal);
        }
      }
      results.push({ projectName: projData?.titulo ?? "Proyecto", projectId, manualEscrito, expoJudges, escritoJudges, expoTotal, expoVoted, escritoTotal, escritoVoted, expoAvg, escritoAvg, evaluationComplete, finalScore: pdfFinalScore, projData });
    }
    sortEvaluationResults(results);
    function getMaxScoreForProject(pid, tipo) {
      const p = projectsById.get(pid);
      if (!p) return 0;
      const feria = p.tipo_feria ?? "";
      if (feria === "Feria Expotecnica") {
        const cat = p.categoria_expotecnica ?? "";
        if (!cat) return tipo === "Escrito" ? 72 : 51;
        const rubric = getExpotecnicaRubricByCategory(cat, tipo);
        if (rubric?.sections) { const count = rubric.sections.reduce((s, sec) => s + sec.indicators.length, 0); if (count) return count * 3; }
      }
      if (feria === "Feria Cientifica y Tecnologica") { let code = String(p.categoria_pronatecyt || "").split(" ")[0]; if (tipo === "Escrito") code = code.replace("B", "C"); return PRONAFECYT_CODE_MAX[code] || (tipo === "Escrito" ? 78 : 40); }
      if (feria === FESTIVAL_FERIA_NAME) {
        if (tipo === "Escrito") return 0;
        const rubric = getFestivalRubricBySubcategory(p.subcategoria_festival);
        const indicatorCount = rubric?.indicators?.length ?? 0;
        return indicatorCount * 3;
      }
      return 0;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFillColor(253,253,253);
    doc.rect(0,0,PDF.PAGE_W,PDF.PAGE_H,"F");
    const now = new Date();
    const M = PDF.MARGIN, W = PDF.PAGE_W;
    let y = pdfHeader(doc, "Reporte de Resultados", logoData);
    const feriaNamesInReport = [...new Set(filteredProjects.map((project) => project.tipo_feria).filter(Boolean))];
    const feriaLabel = selectedFeria || (feriaNamesInReport.length === 1 ? feriaNamesInReport[0] : "Todas las ferias");
    const assignedJudgeIds = new Set(
      assignmentsResult
        .filter((assignment) => projectIds.has(assignment.proyecto_id))
        .map((assignment) => assignment.juez_id)
    );
    const evaluationDateLabel = selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("es-CR", { dateStyle: "long" }) : "Todos los días";
    const infoLines = [`Día de evaluación: ${evaluationDateLabel}`, `Feria: ${feriaLabel}`, `Total de proyectos: ${results.length}`, `Total de jueces asignados: ${assignedJudgeIds.size}`, `Total evaluaciones: ${filteredEvals.length}`, `Generado: ${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR")}`];
    y = pdfInfoBox(doc, infoLines, y);
    y = pdfSubHeader(doc, "Ranking de proyectos", y);
    const resultGroups = new Map();
    for (const result of results) {
      const project = projectsById.get(result.projectId);
      const category = project?.tipo_feria === "Feria Cientifica y Tecnologica"
        ? project.categoria_pronatecyt || "Sin categoría"
        : project?.categoria_expotecnica ?? project?.categoria_festival ?? "Sin categoría";
      const subcategory = project?.tipo_feria === FESTIVAL_FERIA_NAME
        ? project.subcategoria_festival || "Sin subcategoría"
        : "";
      const level = project?.tipo_feria === FESTIVAL_FERIA_NAME
        ? project.nivel_educativo || "Sin nivel"
        : "";
      const groupLabel = getResultCategoryGroupLabel(project?.tipo_feria ?? "Feria", category, level, selectedFeria, subcategory);
      const groupKey = JSON.stringify([project?.tipo_feria ?? "Feria", groupLabel]);
      if (!resultGroups.has(groupKey)) {
        const categoryTitle = [category, subcategory, level].filter(Boolean).join(" — ");
        resultGroups.set(groupKey, {
          label: groupLabel,
          feria: project?.tipo_feria ?? "Feria",
          categoryTitle,
          results: []
        });
      }
      resultGroups.get(groupKey).results.push(result);
    }
    const getCategoryHeading = (group, winner, continued = false) => {
      const contentW = W - 2 * M - 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.2);
      const feriaLines = doc.splitTextToSize(group.feria.toLocaleUpperCase("es-CR"), contentW);
      doc.setFontSize(12);
      const categoryLines = doc.splitTextToSize(group.categoryTitle || group.label, contentW - 4);
      const continuationLines = continued ? ["CONTINUACIÓN"] : [];
      const winnerText = winner
        ? `Ganador: ${winner.projectName} (${winner.finalScore.toFixed(0)} pts)`
        : "Ganador pendiente de evaluación";
      doc.setFontSize(6.2);
      const winnerLines = continued ? [] : doc.splitTextToSize(winnerText, contentW);
      const kickerH = feriaLines.length * 2.2;
      const categoryBandH = Math.max(7.8, categoryLines.length * 4.8 + 1.8);
      const continuationH = continuationLines.length * 2.1;
      const winnerH = winnerLines.length * 2.8;
      const headingH = 1.5 + kickerH + 0.3 + categoryBandH + 0.5 + continuationH + winnerH + 1.5;
      return { feriaLines, categoryLines, continuationLines, winnerLines, categoryBandH, headingH };
    };
    const drawCategoryHeading = (group, winner, headingY, layout) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...PDF.BORDER);
      doc.roundedRect(M, headingY, W - 2 * M, layout.headingH, 1.5, 1.5, "FD");
      doc.setFillColor(...PDF.GOLD);
      doc.roundedRect(M, headingY, 1.5, layout.headingH, 0.4, 0.4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.2);
      doc.setTextColor(...PDF.MUTED);
      doc.text(layout.feriaLines, M + 4, headingY + 3.1);
      const bandX = M + 3;
      const bandY = headingY + 1.5 + layout.feriaLines.length * 2.2 + 0.3;
      const bandW = W - 2 * M - 6;
      doc.setFillColor(242, 246, 252);
      doc.setDrawColor(...PDF.BORDER);
      doc.roundedRect(bandX, bandY, bandW, layout.categoryBandH, 1, 1, "FD");
      doc.setFillColor(...PDF.GOLD);
      doc.roundedRect(bandX, bandY, 1.2, layout.categoryBandH, 0.3, 0.3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...PDF.PRIMARY);
      doc.text(layout.categoryLines, bandX + 3, bandY + 5.1);
      let lowerY = bandY + layout.categoryBandH + 2.5;
      if (layout.continuationLines.length) {
        doc.setFontSize(5.2);
        doc.setTextColor(...PDF.MUTED);
        doc.text(layout.continuationLines, M + 4, lowerY);
        lowerY += layout.continuationLines.length * 2.1;
      }
      if (layout.winnerLines.length) {
        doc.setFontSize(6.2);
        doc.setTextColor(...(winner ? PDF.SUCCESS : PDF.MUTED));
        doc.text(layout.winnerLines, M + 4, lowerY);
      }
      return layout.headingH + 1.5;
    };
    let rowIdx=0;
    const getResultRow = (r) => {
      const project = projectsById.get(r.projectId);
      const feriaLabel = project?.categoria_pronatecyt || project?.categoria_expotecnica || project?.categoria_festival || "";
      const levelLabel = project?.tipo_feria === FESTIVAL_FERIA_NAME ? project?.nivel_educativo : "";
      const classification = [feriaLabel, levelLabel].filter(Boolean).join(" — ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.4);
      const titleLines = doc.splitTextToSize(r.projectName, 130);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      const classificationLines = classification ? doc.splitTextToSize(classification, 130) : [];
      const height = Math.max(11, titleLines.length * 3.6 + classificationLines.length * 3 + (classificationLines.length ? 2 : 0) + 4.5);
      const totalVoted = r.expoVoted + r.escritoVoted;
      const stateText = getEvaluationStatus({
        evaluationComplete: r.evaluationComplete,
        totalVoted,
        totalAssigned: r.expoTotal + r.escritoTotal
      });
      return { r, titleLines, classificationLines, height, stateText };
    };
    for (const group of resultGroups.values()) {
      const winner = group.results.find((result) => result.evaluationComplete && result.finalScore > 0);
      const rows = group.results.map(getResultRow);
      const heading = getCategoryHeading(group, winner);
      y = pdfCheckPage(doc, y, heading.headingH + 1.5 + 9 + rows[0].height);
      drawCategoryHeading(group, winner, y, heading);
      y += heading.headingH + 1.5;
      y = pdfResultsTableHeader(doc, y);
      for (const row of rows) {
        const pagesBeforeRow = doc.internal.getNumberOfPages();
        const continuedHeading = getCategoryHeading(group, winner, true);
        y = pdfCheckPage(doc, y, row.height + 0.6);
        if (doc.internal.getNumberOfPages() > pagesBeforeRow) {
          drawCategoryHeading(group, winner, y, continuedHeading);
          y += continuedHeading.headingH + 1.5;
          y = pdfResultsTableHeader(doc, y);
        }
        const { r, titleLines, classificationLines, height } = row;
        const scoreY = y + height / 2 + 0.5;
        const isFirst = rowIdx === 0;
        doc.setFillColor(isFirst ? 253 : (rowIdx % 2 === 0 ? 255 : 248), isFirst ? 251 : (rowIdx % 2 === 0 ? 255 : 250), isFirst ? 247 : (rowIdx % 2 === 0 ? 255 : 252));
        doc.setDrawColor(...PDF.BORDER);
        doc.roundedRect(M, y - 1, W - 2 * M, height, 1.1, 1.1, "FD");
        if (isFirst) { doc.setFillColor(...PDF.GOLD); doc.roundedRect(M, y - 1, 1.3, height, 0.4, 0.4, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(String(r.projectId), M + 8, scoreY, { align: "center" });
        doc.setFontSize(6.8);
        doc.text(titleLines, M + 18, y + 3.1);
        if (classificationLines.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.2);
          doc.setTextColor(...PDF.MUTED);
          doc.text(classificationLines, M + 18, y + 3.1 + titleLines.length * 3.3);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...(r.evaluationComplete ? PDF.PRIMARY : PDF.MUTED_LIGHT));
        doc.text(r.evaluationComplete ? r.finalScore.toFixed(0) : "Pendiente", M + W - 2 * M - 30, scoreY, { align: "center" });
        const stateColor = row.stateText === "Completa" ? PDF.SUCCESS : row.stateText === "Incompleta" ? PDF.WARNING : PDF.MUTED_LIGHT;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(...stateColor);
        doc.text(row.stateText.toUpperCase(), M + W - 2 * M - 4, scoreY, { align: "right" });
        y += height + 0.6;
        rowIdx++;
      }
    }
    y+=4;
    y = pdfSubHeader(doc, "Detalle por proyecto — jueces", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(...PDF.MUTED);
    doc.text("El nombre completo vincula cada fila con el ranking. Evaluado incluye puntaje 0; Pendiente = asignado sin voto; Sin asignación = no hay juez.", M, y+3);
    y += 6;
    const detailCols = { project: M+2, judge: M+72, expo: M+107, escrito: M+146 };
    const detailWidths = { project: 68, judge: 31, expo: 35, escrito: 36 };
    const drawJudgeTableHeader = (headerY) => {
      doc.setFillColor(...PDF.PRIMARY);
      doc.roundedRect(M, headerY, W-2*M, 6, 1.2,1.2,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");
      doc.setFontSize(5.8);
      doc.text("PROYECTO", detailCols.project, headerY+4);
      doc.text("JUEZ", detailCols.judge, headerY+4);
      doc.text("EXPO · PUNTAJE / MÁX.", detailCols.expo, headerY+4);
      doc.text("ESCRITO · PUNTAJE / MÁX.", detailCols.escrito, headerY+4);
    };
    y = pdfCheckPage(doc, y, 8);
    drawJudgeTableHeader(y);
    y += 8;
    let detailRowIndex = 0;
    for (const r of results) {
      const judgeGroups = new Map();
      for (const [type, judges] of [["expo", r.expoJudges], ["escrito", r.escritoJudges]]) {
        for (const judge of judges) {
          const key = String(judge.judgeId ?? judge.judgeName);
          if (!judgeGroups.has(key)) judgeGroups.set(key, { judgeName: judge.judgeName, expo: [], escrito: [] });
          judgeGroups.get(key)[type].push(judge);
        }
      }
      const rows = [];
      for (const group of judgeGroups.values()) {
        const count = Math.max(group.expo.length, group.escrito.length);
        for (let index = 0; index < count; index++) {
        rows.push({ judgeId: group.expo[index]?.judgeId ?? group.escrito[index]?.judgeId, judgeName: group.judgeName, expo: group.expo[index] ?? null, escrito: group.escrito[index] ?? null });
        }
      }
      if (r.manualEscrito !== null) rows.push({ judgeName: "Puntaje escrito manual", expo: null, escrito: { sum: r.manualEscrito, voted: true, manual: true } });
      for (const row of rows) {
        const projectLines = doc.splitTextToSize(r.projectName, detailWidths.project);
        const judgeLines = doc.splitTextToSize(row.judgeName, detailWidths.judge);
        const expoLabel = row.expo?.manual ? `Manual · ${row.expo.sum}/${getMaxScoreForProject(r.projectId, "Exposición")}` : row.expo ? (row.expo.voted ? `Evaluado · ${row.expo.sum}/${getMaxScoreForProject(r.projectId, "Exposición")}` : `Pendiente · —/${getMaxScoreForProject(r.projectId, "Exposición")}`) : "Sin asignación";
        const escritoLabel = r.projData?.tipo_feria === FESTIVAL_FERIA_NAME ? "No aplica" : row.escrito?.manual ? `Manual · ${row.escrito.sum}/${getMaxScoreForProject(r.projectId, "Escrito")}` : row.escrito ? (row.escrito.voted ? `Evaluado · ${row.escrito.sum}/${getMaxScoreForProject(r.projectId, "Escrito")}` : `Pendiente · —/${getMaxScoreForProject(r.projectId, "Escrito")}`) : "Sin asignación";
        const expoLines = doc.splitTextToSize(expoLabel, detailWidths.expo);
        const escritoLines = doc.splitTextToSize(escritoLabel, detailWidths.escrito);
        const lineCount = Math.max(projectLines.length, judgeLines.length, expoLines.length, escritoLines.length);
        const rowH = Math.max(7.2, lineCount * 2.8 + 2.4);
        const pagesBeforeRow = doc.internal.getNumberOfPages();
        y = pdfCheckPage(doc, y, rowH);
        if (doc.internal.getNumberOfPages() > pagesBeforeRow) {
          drawJudgeTableHeader(y);
          y += 8;
        }
        if (detailRowIndex % 2 === 1) {
          doc.setFillColor(...PDF.ROW_ALT);
          doc.rect(M, y-1, W-2*M, rowH, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(projectLines, detailCols.project, y+3.8);
        doc.setTextColor(...PDF.INK_LIGHT);
        doc.text(judgeLines, detailCols.judge, y+3.8);
        doc.text(expoLines, detailCols.expo, y+3.8);
        doc.text(escritoLines, detailCols.escrito, y+3.8);
        doc.setDrawColor(...PDF.BORDER);
        doc.setLineWidth(0.12);
        doc.line(M, y+rowH, W-M, y+rowH);
        y += rowH;
        for (const observation of [
          { tipo: "Exposición", text: row.expo?.observation },
          { tipo: "Escrito", text: row.escrito?.observation }
        ]) {
          if (!observation.text?.trim()) continue;
          const label = `Observación · ID ${r.projectId} · ${r.projectName} · ${row.judgeName} · ${observation.tipo}`;
          const obsWidth = W - 2 * M - 10;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.8);
          const labelLines = doc.splitTextToSize(label, obsWidth);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.8);
          const textLines = String(observation.text).replace(/\r\n?/g, "\n").split("\n").flatMap((line) => line ? doc.splitTextToSize(line, obsWidth) : [""]);
          const lineH = 2.8;
          const obsH = 3 + labelLines.length * lineH + textLines.length * lineH + 3;
          const pagesBeforeObservation = doc.internal.getNumberOfPages();
          y = pdfCheckPage(doc, y, obsH);
          if (doc.internal.getNumberOfPages() > pagesBeforeObservation) {
            drawJudgeTableHeader(y);
            y += 8;
          }
          doc.setFillColor(...PDF.GOLD_LIGHT);
          doc.setDrawColor(...PDF.BORDER);
          doc.roundedRect(M, y - 1, W - 2 * M, obsH, 1, 1, "FD");
          doc.setFillColor(...PDF.GOLD);
          doc.roundedRect(M, y - 1, 1.4, obsH, 0.3, 0.3, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.8);
          doc.setTextColor(...PDF.PRIMARY);
          doc.text(labelLines, M + 5, y + 2.3);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...PDF.INK_LIGHT);
          doc.text(textLines, M + 5, y + 2.3 + labelLines.length * lineH);
          y += obsH + 1;
        }
        detailRowIndex++;
      }
    }
    // Resumen general
    y = pdfCheckPage(doc, y, 14);
    const summaryW = W-2*M;
    const totalExpoVotes = results.reduce((s,r)=>s+r.expoVoted,0);
    const totalExpoAssigned = results.reduce((s,r)=>s+r.expoTotal,0);
    const totalEscritoVotes = results.reduce((s,r)=>s+r.escritoVoted,0);
    const totalEscritoAssigned = results.reduce((s,r)=>s+r.escritoTotal,0);
    const totalVotes = totalExpoVotes+totalEscritoVotes;
    const totalAssigned = totalExpoAssigned+totalEscritoAssigned;
    const pctVotacion = totalAssigned>0? Math.round(totalVotes/totalAssigned*100):0;
    const completedCount = results.filter(r=>r.evaluationComplete).length;
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.setDrawColor(...PDF.GOLD);
    doc.roundedRect(M, y, summaryW, 18, 2,2,"FD");
    doc.setFont("helvetica","bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text(`Progreso: ${completedCount}/${results.length} completos · ${totalVotes}/${totalAssigned} evaluaciones (${pctVotacion}%)`, M+4, y+6);
    doc.setFont("helvetica","normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF.MUTED);
    doc.text(`Proyecto líder: ${results[0]?.projectName||"—"} — ${results[0]?.evaluationComplete? Math.round(results[0].finalScore)+" pts":"pendiente"}`, M+4, y+11);
    y+=22;
    y = pdfSignatureBlock(doc, y, ["Firma responsable", "Sello institucional"]);
    pdfFooter(doc, now);
    const fileNameFeria = selectedFeria || (feriaNamesInReport.length === 1 ? feriaNamesInReport[0] : "todas_las_ferias");
    const fileNameSlug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
    const fileName = `resultados_${selectedDate || "todas_las_fechas"}_${fileNameSlug(fileNameFeria)}.pdf`;
    doc.save(fileName);
    showToast("PDF exportado correctamente.", "success");
  } catch (err) {
    console.error("Error generating admin PDF:", err);
    showToast("No se pudo generar el PDF. Revisa la conexion e intenta de nuevo.", "error");
  }
}

