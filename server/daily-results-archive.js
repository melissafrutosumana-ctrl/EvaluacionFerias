import {
  calcAverage,
  calcFinalScore,
  calcPronatecytFinalScore,
  calcExpotecnicaFinalScore,
  PRONAFECYT_C_RAW_MAX,
  FESTIVAL_FERIA_NAME
} from "../js/scoring.js";

const PAGE_SIZE = 1000;
const PROJECT_SELECT = "*";

function createSupabaseHeaders(secretKey, extra = {}) {
  return { apikey: secretKey, "Content-Type": "application/json", ...extra };
}

async function callRpc(supabaseUrl, secretKey, name, params) {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, supabaseUrl), {
    method: "POST",
    headers: createSupabaseHeaders(secretKey),
    body: JSON.stringify(params)
  });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    throw new Error(`Supabase devolvió una respuesta inválida al ejecutar ${name}.`);
  }
  if (!response.ok) throw new Error(data?.message || `No se pudo ejecutar ${name}.`);
  return data;
}

async function fetchRestRows(supabaseUrl, secretKey, table, query) {
  const rows = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.search = query.toString();
    const response = await fetch(url, {
      headers: createSupabaseHeaders(secretKey, {
        Range: `${start}-${start + PAGE_SIZE - 1}`,
        "Range-Unit": "items"
      })
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`No se pudieron cargar los datos diarios de ${table}.`);
    const page = body ? JSON.parse(body) : [];
    if (!Array.isArray(page)) throw new Error(`Supabase devolvió datos inválidos de ${table}.`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function getCostaRicaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function buildDailyResultsRows(projects, assignments, evaluations) {
  const assignmentsByProject = new Map();
  for (const assignment of assignments) {
    const projectId = Number(assignment.proyecto_id);
    const rows = assignmentsByProject.get(projectId) ?? [];
    rows.push(assignment);
    assignmentsByProject.set(projectId, rows);
  }

  const ballots = new Map();
  for (const evaluation of evaluations) {
    const type = evaluation.tipo_evaluacion ?? "Exposición";
    const key = `${Number(evaluation.proyecto_id)}-${Number(evaluation.juez_id)}-${type}`;
    const current = ballots.get(key) ?? { sum: 0, count: 0 };
    const score = Number(evaluation.nota);
    if (Number.isFinite(score)) {
      current.sum += score;
      current.count += 1;
    }
    ballots.set(key, current);
  }

  return projects.map((project) => {
    const projectId = Number(project.id);
    const projectAssignments = assignmentsByProject.get(projectId) ?? [];
    const expoJudges = [];
    const writtenJudges = [];

    for (const assignment of projectAssignments) {
      const type = assignment.tipo_evaluacion ?? "Exposición";
      const key = `${projectId}-${Number(assignment.juez_id)}-${type}`;
      const ballot = ballots.get(key);
      const judge = { sum: ballot?.sum ?? 0, voted: Boolean(ballot?.count) };
      if (type === "Escrito") writtenJudges.push(judge);
      else expoJudges.push(judge);
    }

    const expoAvg = calcAverage(expoJudges);
    const writtenAvg = calcAverage(writtenJudges);
    const expoVoted = expoJudges.filter((judge) => judge.voted).length;
    const writtenVoted = writtenJudges.filter((judge) => judge.voted).length;
    const expoTotal = expoJudges.length;
    const writtenTotal = writtenJudges.length;
    const isScientific = project.tipo_feria === "Feria Cientifica y Tecnologica";
    const isExpotecnica = project.tipo_feria === "Feria Expotecnica";
    const isFestival = project.tipo_feria === FESTIVAL_FERIA_NAME;
    const category = isScientific
      ? String(project.categoria_pronatecyt ?? "Sin categoría")
      : isExpotecnica
        ? String(project.categoria_expotecnica ?? "Sin categoría")
        : isFestival
          ? String(project.categoria_festival ?? "Sin categoría")
          : "Sin categoría";
    const writtenCode = String(project.categoria_pronatecyt ?? "").split(" ")[0].replace("B", "C");
    const writtenMax = isScientific
      ? (PRONAFECYT_C_RAW_MAX[writtenCode] ?? 0)
      : isExpotecnica
        ? ({ "DESAFIO STEAM": 105, "EMPRENDIMIENTO E INNOVACION": 72 }[project.categoria_expotecnica] ?? 0)
        : 0;
    const manualWritten = writtenMax > 0 && project.puntaje_escrito_manual != null
      ? Number(project.puntaje_escrito_manual)
      : null;
    const writtenAvgFinal = manualWritten ?? writtenAvg;
    const writtenVotedFinal = manualWritten !== null ? 1 : writtenVoted;
    const hasEvaluation = expoVoted + writtenVoted > 0 || manualWritten !== null;
    const complete = hasEvaluation && (expoTotal === 0 || expoVoted === expoTotal) &&
      (manualWritten !== null || writtenTotal === 0 || writtenVoted === writtenTotal);

    let finalScore;
    if (isScientific) {
      const bCode = String(project.categoria_pronatecyt ?? "").split(" ")[0];
      finalScore = calcPronatecytFinalScore(bCode, expoAvg, manualWritten ?? writtenAvg);
    } else if (isExpotecnica) {
      finalScore = calcExpotecnicaFinalScore(project.categoria_expotecnica, expoAvg, manualWritten ?? writtenAvg);
    } else if (manualWritten !== null) {
      finalScore = expoVoted > 0 ? expoAvg + manualWritten : manualWritten;
    } else {
      finalScore = calcFinalScore(expoVoted, expoAvg, writtenVotedFinal, writtenAvgFinal);
    }

    return {
      projectId,
      project: project.titulo ?? "Proyecto",
      feria: project.tipo_feria ?? "—",
      category,
      status: complete
        ? "Completa"
        : (expoTotal + writtenTotal === 0 ? "Sin asignaciones" : `Pendiente (${expoVoted + writtenVoted}/${expoTotal + writtenTotal})`),
      expo: expoVoted ? expoAvg.toFixed(2) : "—",
      written: manualWritten !== null ? manualWritten.toFixed(2) : (writtenVoted ? writtenAvg.toFixed(2) : "—"),
      final: complete ? finalScore.toFixed(2) : "—",
      complete
    };
  });
}

async function makePdf({ evaluationDate, projects, assignments, evaluations, generatedAt }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const resultRows = buildDailyResultsRows(projects, assignments, evaluations);
  const rows = resultRows.map((row) => [
    String(row.projectId), row.project, `${row.feria} — ${row.category}`, row.status,
    row.expo, row.written, row.final
  ]);
  const completeCount = resultRows.filter((row) => row.complete).length;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `Resultados del ${evaluationDate}`, subject: "Corte diario de evaluaciones" });
  doc.setFillColor(13, 42, 91);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Corte diario de evaluaciones", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Día de evaluación: ${new Date(`${evaluationDate}T12:00:00`).toLocaleDateString("es-CR", { dateStyle: "long" })}`, 14, 24);

  doc.setTextColor(13, 42, 91);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${projects.length} proyectos · ${completeCount} evaluaciones completas · ${projects.length - completeCount} pendientes`, 14, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(95, 107, 129);
  doc.text("Puntajes finales calculados con las reglas oficiales de cada feria; los pendientes no muestran puntaje final.", 14, 49);

  autoTable(doc, {
    startY: 54,
    head: [["ID", "Proyecto", "Feria y categoría", "Estado", "Exposición", "Escrito", "Puntaje final"]],
    body: rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.2, overflow: "linebreak" },
    headStyles: { fillColor: [13, 42, 91], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 44 }, 2: { cellWidth: 29 }, 3: { cellWidth: 23 }, 4: { cellWidth: 19, halign: "right" }, 5: { cellWidth: 19, halign: "right" }, 6: { cellWidth: 21, halign: "right" } },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(95, 107, 129);
      doc.text(`Generado: ${generatedAt.toLocaleString("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "medium", timeStyle: "short" })}`, 14, 288);
    }
  });

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export async function archiveDailyResultsAfterEvaluation({ supabaseUrl, secretKey, sessionToken, projectId }) {
  if (!supabaseUrl || !secretKey || !sessionToken) throw new Error("Falta la configuración para guardar el corte diario.");
  const normalizedProjectId = Number(projectId);
  if (!Number.isSafeInteger(normalizedProjectId) || normalizedProjectId <= 0) throw new Error("El proyecto de la evaluación no es válido.");

  const sessionResult = await callRpc(supabaseUrl, secretKey, "restore_session", { p_session_token: sessionToken });
  const session = Array.isArray(sessionResult) ? sessionResult[0] : sessionResult;
  if (!session?.user_id) throw new Error("La sesión dejó de ser válida.");
  const role = String(session.user_role ?? "").trim().toLocaleLowerCase("es-CR");
  if (role === "juez") {
    const assignments = await callRpc(supabaseUrl, secretKey, "get_judge_projects", { p_session_token: sessionToken });
    if (!Array.isArray(assignments) || !assignments.some((project) => Number(project.id) === normalizedProjectId)) {
      throw new Error("El juez no tiene asignado ese proyecto.");
    }
  } else if (role !== "administrador") {
    throw new Error("El rol no puede actualizar el corte diario.");
  }

  const generatedAt = new Date();
  const projectQuery = new URLSearchParams({ select: PROJECT_SELECT });
  const [allProjects, targetRows] = await Promise.all([
    fetchRestRows(supabaseUrl, secretKey, "proyectos_ferias", projectQuery),
    fetchRestRows(supabaseUrl, secretKey, "proyectos_ferias", new URLSearchParams({ select: "id,fecha_evaluacion", id: `eq.${normalizedProjectId}` }))
  ]);
  const targetProject = targetRows[0];
  if (!targetProject) throw new Error("El proyecto de la evaluación ya no existe.");
  const evaluationDate = targetProject.fecha_evaluacion || getCostaRicaDate(generatedAt);
  const projects = allProjects.filter((project) =>
    project.fecha_evaluacion === evaluationDate || (!targetProject.fecha_evaluacion && !project.fecha_evaluacion)
  );
  const uniqueProjects = [...new Map(projects.filter(Boolean).map((project) => [Number(project.id), project])).values()];
  const projectIds = uniqueProjects.map((project) => Number(project.id));
  if (!projectIds.length) throw new Error("No hay proyectos para generar el corte diario.");

  const projectFilter = `in.(${projectIds.join(",")})`;
  const [assignments, evaluations] = await Promise.all([
    fetchRestRows(supabaseUrl, secretKey, "asignaciones_jueces", new URLSearchParams({ select: "proyecto_id,juez_id,tipo_evaluacion", proyecto_id: projectFilter })),
    fetchRestRows(supabaseUrl, secretKey, "evaluaciones_proyectos", new URLSearchParams({ select: "proyecto_id,juez_id,nota,tipo_evaluacion", proyecto_id: projectFilter }))
  ]);

  const pdfBase64 = await makePdf({ evaluationDate, projects: uniqueProjects, assignments, evaluations, generatedAt });
  const fileName = `resultados_${evaluationDate}_todas_las_ferias.pdf`;
  await callRpc(supabaseUrl, secretKey, "save_automatic_daily_results_pdf_archive", {
    p_session_token: sessionToken,
    p_source_project_id: normalizedProjectId,
    p_evaluation_date: evaluationDate,
    p_feria: "Todas las ferias",
    p_project_count: uniqueProjects.length,
    p_file_name: fileName,
    p_pdf_base64: pdfBase64,
    p_generated_at: generatedAt.toISOString()
  });
}
