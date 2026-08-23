import { supabase } from "./supabase.js";
import { showToast, FESTIVAL_FERIA_NAME, PRONAFECYT_CODE_MAX, calcAverage, calcFinalScore, calcPronatecytFinalScore, calcExpotecnicaFinalScore } from "./utils.js";
import { getExpotecnicaRubricByCategory } from "./rubrics.js";
import { loadUsers, fetchAllEvaluations, fetchAllRpc } from "./data.js";

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

let autoTablePromise = null;
export function loadAutoTable() {
    if (window.jspdf?.jsPDF?.API?.autoTable || window.jspdf?.jsPDF?.prototype?.autoTable) return Promise.resolve();
    if (autoTablePromise) return autoTablePromise;
    // jsPDF 2.5.1 autoTable plugin attaches to window.jspdf.jsPDF.API
    autoTablePromise = new Promise((resolve, reject) => {
        if (document.querySelector('script[data-autotable]')) return resolve();
        const s = document.createElement("script");
        s.dataset.autotable = "1";
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.8/jspdf.plugin.autotable.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load jspdf-autotable"));
        document.head.appendChild(s);
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
    MARGIN: 14,
    PAGE_W: 210,
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
    let y = 10;
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y, PDF.PAGE_W - 2 * PDF.MARGIN, 30, 3, 3, "F");
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.6);
    doc.line(PDF.MARGIN + 4, y + 24, PDF.PAGE_W - PDF.MARGIN - 4, y + 24);
    const logoX = PDF.MARGIN + 5;
    if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", logoX, y + 4, 48, 19); } catch (e) { console.warn("Error logo", e); }
        // si hay logo, texto a la derecha
        const tx = PDF.MARGIN + 58;
        doc.setTextColor(...PDF.GOLD);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("REPÚBLICA DE COSTA RICA", tx, y + 9);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("Ministerio de Educación Pública", tx, y + 14.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(200, 215, 235);
        doc.text("Dirección Regional Pacífico Central  ·  Sistema de Evaluación de Ferias", tx, y + 19);
    } else {
        doc.setTextColor(...PDF.GOLD);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("REPÚBLICA DE COSTA RICA", PDF.MARGIN + 6, y + 9);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("Ministerio de Educación Pública", PDF.MARGIN + 6, y + 15);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(200, 215, 235);
        doc.text("Dirección Regional Pacífico Central  ·  Sistema de Evaluación de Ferias", PDF.MARGIN + 6, y + 20);
    }
    y += 38;
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

export function pdfInfoBox(doc, lines, y) {
    const boxW = PDF.PAGE_W - 2 * PDF.MARGIN;
    const boxH = lines.length * 5.2 + 10;
    y = pdfCheckPage(doc, y, boxH + 4);
    doc.setFillColor(...PDF.ROW_ALT);
    doc.setDrawColor(...PDF.BORDER);
    doc.roundedRect(PDF.MARGIN, y, boxW, boxH, 2.2, 2.2, "FD");
    doc.setFillColor(...PDF.GOLD);
    doc.roundedRect(PDF.MARGIN, y, 2.2, boxH, 0.6, 0.6, "F");
    let ly = y + 6;
    lines.forEach((line) => {
        const sep = line.indexOf(":");
        if (sep > 0) {
            const label = line.slice(0, sep + 1);
            const value = line.slice(sep + 1).trim();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6);
            doc.setTextColor(...PDF.MUTED);
            doc.text(label.toUpperCase(), PDF.MARGIN + 5, ly);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(...PDF.INK);
            doc.text(value, PDF.MARGIN + 28, ly);
        } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...PDF.MUTED);
            doc.text(line, PDF.MARGIN + 5, ly);
        }
        ly += 5.2;
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
        doc.addPage();
        doc.setFillColor(253, 253, 253);
        doc.rect(0, 0, PDF.PAGE_W, PDF.PAGE_H, "F");
        return PDF.MARGIN;
    }
    return y;
}


export async function generateJudgePDF(user) {
    await loadJSPDF();
    const logoData = await loadMEPLogo();
    const [evalResult, projectsData] = await Promise.all([
        fetchAllRpc("get_judge_evaluations_with_titles", { p_session_token: user.session_token }),
        fetchAllRpc("get_judge_projects", { p_session_token: user.session_token })
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
                p_session_token: user.session_token,
                p_project_id: c.pid,
                p_tipo_evaluacion: c.tipo
            }).then((r) => ({ key: `${c.pid}-${c.tipo}`, data: r.data, error: r.error }))
        )
    );
    const obsMap = new Map();
    obsResults.forEach((o) => {
        if (!o.error && o.data && o.data.length) obsMap.set(o.key, o.data[0]?.texto ?? "");
    });
    const grouped = new Map();
    data.forEach((item) => {
        const pid = Number(item.proyecto_id);
        const tipo = item.tipo_evaluacion ?? "Exposición";
        const key = `${pid}-${tipo}`;
        if (!grouped.has(key)) {
            const proj = projectsMap.get(pid);
            const titulo = item.titulo || item.proyectos_ferias?.titulo || proj?.titulo || `Proyecto #${pid}`;
            grouped.set(key, { titulo, tipo, projectData: proj ?? null, items: [], total: 0, observacion: obsMap.get(key) ?? "" });
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
    let y = pdfHeader(doc, "Reporte de Evaluaciones", logoData ? "MEP" : mockUserTipo(user));
    function mockUserTipo(u){ return u.tipo_feria || ""; }

    const infoLines = [
        `Juez: ${user.nombre}`,
        `Fecha: ${now.toLocaleDateString("es-CR")}`,
        `Hora: ${now.toLocaleTimeString("es-CR")}`,
        user.tipo_feria ? `Feria: ${user.tipo_feria}` : "",
        `Proyectos evaluados: ${grouped.size}`,
    ].filter(Boolean);
    y = pdfInfoBox(doc, infoLines, y);

    // Resumen premium con autoTable (paginación automática, sin cortes)
    y = pdfSubHeader(doc, "Resumen — Puntajes por proyecto", y);
    await loadAutoTable();
    const tableW = W - 2 * M;
    // Pre-calcula grandTotal para total general
    let grandTotal = 0;
    for (const [, g] of grouped) grandTotal += g.total;
    const resumenBody = [...grouped.values()].map(g => {
        const feriaLbl = g.projectData?.tipo_feria === "Feria Cientifica y Tecnologica" ? (g.projectData.categoria_pronatecyt?.split(" -")[0] || "") : (g.projectData?.categoria_expotecnica || g.projectData?.categoria_festival || "");
        const titulo = feriaLbl ? `${g.titulo}  ·  ${feriaLbl.slice(0,30)}` : g.titulo;
        return [titulo, g.tipo === "Escrito" ? "ESCRITO" : "EXPO", String(g.items.length), String(g.total)];
    });
    doc.autoTable({
        startY: y,
        head: [["PROYECTO", "TIPO", "CRIT.", "PUNTAJE"]],
        body: resumenBody,
        theme: "plain",
        margin: { left: M, right: M },
        headStyles: { fillColor: PDF.PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 6.3, halign: "center", valign: "middle", cellPadding: {top:2,bottom:2,left:2,right:2} },
        columnStyles: {
            0: { cellWidth: 110, fontStyle: "bold", fontSize: 6.8, textColor: PDF.INK, cellPadding: {top:2,bottom:2,left:2,right:2} },
            1: { cellWidth: 22, halign: "center", fontSize: 5.5, textColor: PDF.MUTED },
            2: { cellWidth: 16, halign: "center", fontSize: 6.8, textColor: PDF.MUTED },
            3: { cellWidth: 24, halign: "center", fontStyle: "bold", fontSize: 8, textColor: PDF.PRIMARY }
        },
        styles: { font: "helvetica", fontSize: 6.8, cellPadding: 2, textColor: PDF.INK_LIGHT, lineColor: PDF.BORDER, lineWidth: 0.18, valign: "middle", overflow: "linebreak" },
        alternateRowStyles: { fillColor: PDF.ROW_ALT },
        didParseCell: function(data){
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
            if (p.tipo_feria === "Festival Estudiantil de las Artes") return p.subcategoria_festival ? `${p.categoria_festival} — ${p.subcategoria_festival}` : p.categoria_festival;
            return p.tipo_feria || "";
        })();
        const innerW = tableW - 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        const tipoTmpW = doc.getTextWidth(g.tipo.toUpperCase()) + 8;
        const hdrWidth = innerW - 18 - tipoTmpW - 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const hdrLines = doc.splitTextToSize(g.titulo, hdrWidth);
        const hdrH = Math.min(16, hdrLines.length > 2 ? 14 : hdrLines.length * 4.8 + 6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.2);
        const catH = catText ? doc.splitTextToSize(catText, innerW).length * 3.8 + 7 : 0;
        // Use autoTable for criteria to get perfect pagination
        const bodyForAuto = g.items.map(it => [it.criterio, String(it.nota)]);
        const obsLines = g.observacion ? doc.splitTextToSize(g.observacion, innerW - 6) : [];
        const obsH = g.observacion ? Math.max(16, obsLines.length * 3.8 + 14) : 0;
        const blockH = hdrH + catH + 7 + (bodyForAuto.length * 7) + 10 + obsH + 10;
        if (blockH < PDF.PAGE_LIMIT - PDF.MARGIN * 2 && y + blockH > PDF.PAGE_LIMIT) {
            doc.addPage();
            doc.setFillColor(253, 253, 253);
            doc.rect(0, 0, PDF.PAGE_W, PDF.PAGE_H, "F");
            y = PDF.MARGIN;
        }
        const cardX = M, cardW = tableW;
        doc.setFillColor(...PDF.PRIMARY);
        doc.roundedRect(cardX, y, cardW, hdrH, 2, 2, "F");
        const idBadge = `#${g.projectData?.id || "—"}`;
        const tipoBadge = g.tipo.toUpperCase();
        const tipoW = doc.getTextWidth(tipoBadge) + 8;
        doc.setFillColor(...PDF.GOLD);
        doc.roundedRect(cardX + cardW - 18, y + 2, 14, 5, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(idBadge, cardX + cardW - 11, y + 5.3, { align: "center" });
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF.GOLD);
        doc.roundedRect(cardX + cardW - 18 - tipoW - 4, y + 2, tipoW, 5, 1.5, 1.5, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(tipoBadge, cardX + cardW - 18 - tipoW / 2 - 4, y + 5.3, { align: "center" });
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        const hdrDisplay = hdrLines.length > 3 ? [hdrLines[0], hdrLines[1], hdrLines[2].slice(0,-3)+"…"] : hdrLines;
        doc.text(hdrDisplay, cardX + 3, y + 5);
        y += hdrH + 2;
        if (catText) {
            const cl = doc.splitTextToSize(catText, innerW);
            const ch = cl.length * 3.8 + 6;
            y = pdfCheckPage(doc, y, ch + 2);
            doc.setFillColor(...PDF.GOLD_LIGHT);
            doc.setDrawColor(...PDF.GOLD);
            doc.roundedRect(cardX + 2, y, cardW - 4, ch, 1.3, 1.3, "FD");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(6.2);
            doc.setTextColor(...PDF.MUTED);
            doc.text(cl, cardX + 5, y + 4.2);
            y += ch + 4;
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
                0: { cellWidth: innerW - 18, fontSize: 6.8, textColor: PDF.INK_LIGHT, cellPadding: {top:1.5,bottom:1.5,left:2,right:2}, overflow: "linebreak" },
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
            doc.text("Observación del juez", M + 6, y + 6);
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


export async function generateAdminPDF(sessionToken) {
  await loadJSPDF();
  const logoData = await loadMEPLogo();
  try {
    const [users, projectsResult, evaluations, assignmentsResult] = await Promise.all([
      loadUsers(),
      fetchAllRpc("get_projects", { p_session_token: sessionToken }),
      fetchAllEvaluations(),
      fetchAllRpc("get_assignments", { p_session_token: sessionToken })
    ]);
    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";
    const allProjects = projectsResult;
    const filteredProjects = selectedFeria ? allProjects.filter((p) => p.tipo_feria === selectedFeria) : allProjects;
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
    const filteredEvals = (evaluations ?? []).filter((r) => projectIds.has(r.proyecto_id));
    if (!filteredEvals.length) {
      showToast("No hay evaluaciones para generar el reporte.", "info");
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
    for (const [projectId, assignedJudges] of assignmentsByProject) {
      if (!projectsById.has(projectId)) continue;
      const projData = projectsById.get(projectId);
      const expoJudges = [], escritoJudges = [];
      let expoVoted = 0, expoTotal = 0, escritoVoted = 0, escritoTotal = 0;
      assignedJudges.forEach((aj) => {
        const tipo = aj.tipo_evaluacion ?? "Exposición";
        const key = `${projectId}-${aj.juez_id}-${tipo}`;
        const voted = votedSet.has(key);
        const entry = { judgeName: aj.judgeName, sum: scoreMap.get(key) || 0, voted };
        if (aj.tipo_evaluacion === "Escrito") { escritoJudges.push(entry); escritoTotal++; if (voted) escritoVoted++; } else { expoJudges.push(entry); expoTotal++; if (voted) expoVoted++; }
      });
      const expoAvg = calcAverage(expoJudges);
      const escritoAvg = calcAverage(escritoJudges);
      const manualEscrito = projData?.puntaje_escrito_manual != null ? Number(projData.puntaje_escrito_manual) : null;
      const escritoAvgFinal = manualEscrito !== null ? manualEscrito : escritoAvg;
      const escritoVotedFinal = manualEscrito !== null ? 1 : escritoVoted;
      const evalComplete = (expoTotal === 0 || expoVoted === expoTotal) && (manualEscrito !== null || escritoTotal === 0 || escritoVoted === escritoTotal);
      let pdfFinalScore = 0;
      if (evalComplete) {
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
      results.push({ projectName: projData?.titulo ?? "Proyecto", projectId, manualEscrito, expoJudges, escritoJudges, expoTotal, expoVoted, escritoTotal, escritoVoted, expoAvg, escritoAvg, evalComplete, finalScore: pdfFinalScore, projData });
    }
    results.sort((a, b) => b.finalScore - a.finalScore);
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
      if (feria === FESTIVAL_FERIA_NAME) return tipo === "Escrito" ? 0 : 12;
      return 0;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFillColor(253,253,253);
    doc.rect(0,0,PDF.PAGE_W,PDF.PAGE_H,"F");
    const now = new Date();
    const M = PDF.MARGIN, W = PDF.PAGE_W;
    let y = pdfHeader(doc, "Reporte de Resultados", logoData ? "MEP" : "");
    const feriaLabel = selectedFeria || "Todas las ferias";
    const isFEA = selectedFeria === FESTIVAL_FERIA_NAME || (results.length > 0 && results.every(r => projectsById.get(r.projectId)?.tipo_feria === FESTIVAL_FERIA_NAME));
    const infoLines = [`Feria: ${feriaLabel}`, `Total de proyectos: ${results.length}`, `Total de jueces participantes: ${usersById.size}`, `Total evaluaciones: ${evaluations.length}`, `Generado: ${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR")}`];
    y = pdfInfoBox(doc, infoLines, y);
    y = pdfSubHeader(doc, "Ranking de proyectos", y);
    const dualCols = !isFEA;
    // Header
    const headerH = 7;
    y = pdfCheckPage(doc, y, headerH+2);
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(M, y, W-2*M, headerH, 1.6,1.6,"F");
    doc.setTextColor(255,255,255);
    doc.setFont("helvetica","bold");
    doc.setFontSize(6.2);
    if (dualCols) {
      doc.text("#", M+3, y+4.5);
      doc.text("PROYECTO", M+10, y+4.5);
      doc.text("EXPO", M+124, y+4.5);
      doc.text("ESCRITO", M+144, y+4.5);
      doc.text("FINAL", M+W-2*M-24, y+4.5, {align:"center"});
      doc.text("ESTADO", M+W-2*M-4, y+4.5, {align:"right"});
    } else {
      doc.text("#", M+3, y+4.5);
      doc.text("PROYECTO", M+10, y+4.5);
      doc.text("PUNTAJE", M+W-2*M-24, y+4.5, {align:"center"});
      doc.text("ESTADO", M+W-2*M-4, y+4.5, {align:"right"});
    }
    y+=headerH+2;
    let rowIdx=0;
    for(let idx=0; idx<results.length; idx++){
      const r = results[idx];
      const feriaLbl = r.projData?.categoria_pronatecyt?.split(" -")[0] || r.projData?.categoria_expotecnica || r.projData?.categoria_festival || "";
      const nameW = dualCols ? 110 : 130;
      doc.setFont("helvetica","bold");
      doc.setFontSize(6.8);
      const tLines = doc.splitTextToSize(r.projectName, nameW);
      const display = tLines.length > 3 ? [tLines[0], tLines[1], tLines[2].slice(0, -3) + "…"] : tLines;
      const rowH = Math.max(10, display.length * 3.6 + (feriaLbl ? 4.5 : 0) + 4);
      y = pdfCheckPage(doc, y, rowH+0.6);
      const isFirst = idx===0;
      doc.setFillColor(isFirst?253: (rowIdx%2===0?255:248), isFirst?251:(rowIdx%2===0?255:250), isFirst?247:(rowIdx%2===0?255:252));
      doc.setDrawColor(...PDF.BORDER);
      doc.roundedRect(M, y-1, W-2*M, rowH, 1.1,1.1,"FD");
      if(isFirst){ doc.setFillColor(...PDF.GOLD); doc.roundedRect(M, y-1, 1.3, rowH, 0.4,0.4,"F"); }
      doc.setFont("helvetica","bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...PDF.INK);
      doc.text(String(idx+1), M+3, y+4);
      doc.setFont("helvetica","bold");
      doc.setFontSize(6.8);
      doc.text(display, M+10, y+3.2);
      if(feriaLbl){
        doc.setFont("helvetica","normal");
        doc.setFontSize(5.2);
        doc.setTextColor(...PDF.MUTED);
        doc.text(feriaLbl.slice(0,32), M+10, y+ display.length*3.6+3.8);
      }
      if(dualCols){
        const expoMax = getMaxScoreForProject(r.projectId, "Exposición");
        const escritoMax = getMaxScoreForProject(r.projectId, "Escrito");
        const expoScore = r.expoTotal>0 && r.expoVoted>0 ? String(Math.round(r.expoAvg)) : "—";
        const escritoScore = r.manualEscrito!==null ? String(Math.round(r.manualEscrito)) : (r.escritoTotal>0 && r.escritoVoted>0 ? String(Math.round(r.escritoAvg)) : "—");
        doc.setFont("helvetica","normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...PDF.MUTED);
        doc.text(`${expoScore}/${expoMax}`, M+128, y+4.5, {align:"center"});
        doc.text(`${escritoScore}/${escritoMax}`, M+148, y+4.5, {align:"center"});
        doc.setFont("helvetica","bold");
        doc.setFontSize(7.5);
        doc.setTextColor(r.evalComplete?PDF.PRIMARY:PDF.MUTED_LIGHT);
        doc.text(r.evalComplete? String(Math.round(r.finalScore)) : "—", M+W-2*M-24, y+4.5, {align:"center"});
      } else {
        const maxScore = getMaxScoreForProject(r.projectId, "Exposición");
        const score = r.expoTotal>0 && r.expoVoted>0 ? String(Math.round(r.expoAvg)) : "0";
        doc.setFont("helvetica","bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF.PRIMARY);
        doc.text(`${score}/${maxScore}`, M+W-2*M-24, y+4.5, {align:"center"});
      }
      const totalVoted = r.expoVoted + r.escritoVoted;
      let stateText = "Pendiente", stateColor = PDF.MUTED_LIGHT;
      if(totalVoted===0){ stateText="Sin evaluar"; stateColor=PDF.MUTED_LIGHT; } else if(r.evalComplete){ stateText="Completa"; stateColor=PDF.SUCCESS; } else { stateText="Incompleta"; stateColor=PDF.WARNING; }
      doc.setFont("helvetica","bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...stateColor);
      doc.text(stateText.toUpperCase(), M+W-2*M-4, y+4.5, {align:"right"});
      y+=rowH+0.6;
      rowIdx++;
    }
    y+=4;
    y = pdfSubHeader(doc, "Detalle por proyecto — jueces", y);
    for(const r of results){
      const proj = r.projData;
      const cat = proj?.categoria_pronatecyt || proj?.categoria_expotecnica || proj?.categoria_festival || "";
      doc.setFont("helvetica","bold");
      doc.setFontSize(7.5);
      const hdrLines = doc.splitTextToSize(r.projectName, W-2*M-6);
      const hdrDisplay = hdrLines.length > 2 ? [hdrLines[0], hdrLines[1].slice(0,-3)+"…"] : hdrLines;
      const hdrH = Math.max(12, hdrDisplay.length*4.8 + 6);
      const catH = cat ? 7 : 0;
      const rowsNeeded = (r.expoJudges.length + r.escritoJudges.length)*7 + 8;
      const blockH = hdrH + catH + 7 + rowsNeeded + 8;
      if(blockH < PDF.PAGE_LIMIT - PDF.MARGIN*2 && y + blockH > PDF.PAGE_LIMIT){
        doc.addPage();
        doc.setFillColor(253,253,253);
        doc.rect(0,0,PDF.PAGE_W,PDF.PAGE_H,"F");
        y = PDF.MARGIN;
      }
      doc.setFillColor(...PDF.PRIMARY);
      doc.roundedRect(M, y, W-2*M, hdrH, 2,2,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");
      doc.setFontSize(7.5);
      doc.text(hdrDisplay, M+3, y+ (hdrDisplay.length>1?6:7));
      y+=hdrH+2;
      if(cat){
        const cl = doc.splitTextToSize(cat.slice(0,80), W-2*M-4);
        doc.setFillColor(...PDF.GOLD_LIGHT);
        doc.setDrawColor(...PDF.GOLD);
        doc.roundedRect(M+2, y, W-2*M-4, 6, 1.2,1.2,"FD");
        doc.setFont("helvetica","italic");
        doc.setFontSize(6);
        doc.setTextColor(...PDF.MUTED);
        doc.text(cl[0], M+4, y+4);
        y+=8;
      }
      y = pdfCheckPage(doc, y, 6);
      doc.setFillColor(...PDF.PRIMARY);
      doc.roundedRect(M, y, W-2*M, 6, 1.2,1.2,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");
      doc.setFontSize(6);
      doc.text("JUEZ", M+3, y+4);
      doc.text("TIPO", M+70, y+4);
      doc.text("PUNTAJE", M+110, y+4);
      doc.text("ESTADO", M+W-2*M-6, y+4, {align:"right"});
      y+=8;
      const entries=[...r.expoJudges.map(j=>({...j,tipo:"Exposición"})), ...r.escritoJudges.map(j=>({...j,tipo:"Escrito"}))];
      let eIdx=0;
      for(const e of entries){
        const rh=7;
        y = pdfCheckPage(doc, y, rh);
        if(eIdx%2===1){ doc.setFillColor(...PDF.ROW_ALT); doc.roundedRect(M, y-1, W-2*M, rh, 0.8,0.8,"F"); }
        doc.setFont("helvetica","normal");
        doc.setFontSize(7);
        doc.setTextColor(...PDF.INK_LIGHT);
        doc.text(e.judgeName, M+3, y+4);
        doc.text(e.tipo, M+70, y+4);
        doc.setFont("helvetica","bold");
        doc.setTextColor(...(e.voted?PDF.PRIMARY:PDF.MUTED_LIGHT));
        doc.text(e.voted?String(e.sum):"—", M+110, y+4);
        doc.setTextColor(...(e.voted?PDF.SUCCESS:PDF.MUTED_LIGHT));
        doc.setFontSize(6);
        doc.text(e.voted?"VOTÓ":"PENDIENTE", M+W-2*M-6, y+4, {align:"right"});
        y+=rh;
        eIdx++;
      }
      y+=6;
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
    const completedCount = results.filter(r=>r.evalComplete).length;
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
    doc.text(`Proyecto líder: ${results[0]?.projectName||"—"} — ${results[0]?.evalComplete? Math.round(results[0].finalScore)+" pts":"pendiente"}`, M+4, y+11);
    y+=22;
    pdfFooter(doc, now);
    const fileName = selectedFeria ? `resultados_${selectedFeria.replace(/\s+/g, "_")}.pdf` : "resultados_generales.pdf";
    doc.save(fileName);
    showToast("PDF exportado correctamente.", "success");
  } catch (err) {
    console.error("Error generating admin PDF:", err);
    showToast("No se pudo generar el PDF. Revisa la conexion e intenta de nuevo.", "error");
  }
}

