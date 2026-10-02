import {
  calcAverage,
  calcFinalScore,
  calcPronatecytFinalScore,
  calcExpotecnicaFinalScore,
  PRONAFECYT_C_RAW_MAX,
  FESTIVAL_FERIA_NAME
} from "../js/scoring.js";

const SNAPSHOT_PAGE_SIZE = 500;
const ARCHIVE_QUIET_WINDOW_MS = 750;
const MAX_REST_PAGES = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export async function fetchDailySnapshotRows({ supabaseUrl, secretKey, sessionToken, evaluationDate }) {
  const rows = [];
  let pageCount = 0;
  let offset = 0;
  let previousPageFingerprint = null;
  for (;;) {
    if (pageCount++ >= MAX_REST_PAGES) throw new Error("La lectura del corte diario excedió el límite seguro de páginas.");
    const page = await callRpc(supabaseUrl, secretKey, "get_daily_results_pdf_snapshot", {
      p_session_token: sessionToken,
      p_evaluation_date: evaluationDate,
      p_offset: offset,
      p_limit: SNAPSHOT_PAGE_SIZE
    });
    if (!Array.isArray(page) || page.length > SNAPSHOT_PAGE_SIZE) {
      throw new Error("Supabase devolvió una página inválida del corte diario.");
    }
    if (page.length === 0) return rows;

    const fingerprint = JSON.stringify(page.map(({ record_type, row_id }) => [record_type, row_id]));
    if (fingerprint === previousPageFingerprint) throw new Error("Supabase repitió una página del corte diario.");
    previousPageFingerprint = fingerprint;
    rows.push(...page);
    if (page.length < SNAPSHOT_PAGE_SIZE) return rows;
    offset += page.length;
  }
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

export async function runDailyResultsArchiveWorker({
  projectId,
  enqueue,
  claim,
  build,
  complete,
  renewLease,
  release,
  waitForQuietPeriod = wait,
  heartbeatIntervalMs = 30000
}) {
  const request = await enqueue(Number(projectId));
  if (!request?.evaluationDate) throw new Error("No se pudo registrar el corte diario pendiente.");

  for (;;) {
    await waitForQuietPeriod(ARCHIVE_QUIET_WINDOW_MS);
    const lease = await claim(request.evaluationDate);
    if (!lease) return { processed: false, reason: "leased-or-not-quiet" };

    let snapshot;
    let heartbeatError = null;
    const heartbeat = renewLease
      ? setInterval(() => {
        renewLease(lease).then((renewed) => {
          if (!renewed) heartbeatError = new Error("Se perdió la lease del corte diario.");
        }).catch((error) => { heartbeatError = error; });
      }, heartbeatIntervalMs)
      : null;
    try {
      snapshot = await build(lease);
      if (heartbeatError) throw heartbeatError;
      if (renewLease && !await renewLease(lease)) throw new Error("Se perdió la lease del corte diario.");
      const processed = await complete(lease, snapshot);
      if (processed) return { processed: true, generation: lease.requestedGeneration };
    } catch (error) {
      await release(lease).catch(() => {});
      throw error;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
    }
  }

}

async function buildDailyResultsSnapshot({ supabaseUrl, secretKey, sessionToken, evaluationDate, sourceProjectId }) {
  const generatedAt = new Date();
  const snapshotRows = await fetchDailySnapshotRows({ supabaseUrl, secretKey, sessionToken, evaluationDate });
  const groupedRows = { project: [], assignment: [], evaluation: [] };
  for (const row of snapshotRows) {
    const target = groupedRows[row.record_type];
    if (!target || !row.row_data || typeof row.row_data !== "object") {
      throw new Error("Supabase devolvió filas inválidas del corte diario.");
    }
    target.push(row.row_data);
  }
  const allProjects = groupedRows.project;
  const sourceProject = allProjects.find((project) => Number(project.id) === sourceProjectId);
  if (!sourceProject) throw new Error("El proyecto de la evaluación ya no existe en el día solicitado.");
  const uniqueProjects = [...new Map(allProjects.map((project) => [Number(project.id), project])).values()];
  if (!uniqueProjects.length) throw new Error("No hay proyectos para generar el corte diario.");
  const assignments = groupedRows.assignment;
  const evaluations = groupedRows.evaluation;

  const pdfBase64 = await makePdf({ evaluationDate, projects: uniqueProjects, assignments, evaluations, generatedAt });
  const fileName = `resultados_${evaluationDate}_todas_las_ferias.pdf`;
  return {
    sourceProjectId,
    evaluationDate,
    projectCount: uniqueProjects.length,
    fileName,
    pdfBase64,
    generatedAt: generatedAt.toISOString()
  };
}

export async function archiveDailyResultsAfterEvaluation({ supabaseUrl, secretKey, sessionToken, projectId }) {
  if (!supabaseUrl || !secretKey || !sessionToken) throw new Error("Falta la configuración para guardar el corte diario.");
  const normalizedProjectId = Number(projectId);
  if (!Number.isSafeInteger(normalizedProjectId) || normalizedProjectId <= 0) throw new Error("El proyecto de la evaluación no es válido.");

  await runDailyResultsArchiveWorker({
    projectId: normalizedProjectId,
    enqueue: async (sourceProjectId) => {
      const result = await callRpc(supabaseUrl, secretKey, "enqueue_daily_results_pdf_archive", {
        p_session_token: sessionToken,
        p_source_project_id: sourceProjectId
      });
      const row = Array.isArray(result) ? result[0] : result;
      return row ? { evaluationDate: row.evaluation_date } : null;
    },
    claim: async (evaluationDate) => {
      const result = await callRpc(supabaseUrl, secretKey, "claim_daily_results_pdf_archive", {
        p_session_token: sessionToken,
        p_evaluation_date: evaluationDate
      });
      const row = Array.isArray(result) ? result[0] : result;
      if (!row?.lease_token) return null;
      return {
        evaluationDate: row.evaluation_date,
        sourceProjectId: Number(row.source_project_id),
        requestedGeneration: Number(row.requested_generation),
        leaseToken: row.lease_token
      };
    },
    build: (lease) => buildDailyResultsSnapshot({
      supabaseUrl,
      secretKey,
      sessionToken,
      evaluationDate: lease.evaluationDate,
      sourceProjectId: lease.sourceProjectId
    }),
    complete: async (lease, snapshot) => callRpc(supabaseUrl, secretKey, "complete_daily_results_pdf_archive", {
      p_session_token: sessionToken,
      p_evaluation_date: lease.evaluationDate,
      p_source_project_id: snapshot.sourceProjectId,
      p_requested_generation: lease.requestedGeneration,
      p_lease_token: lease.leaseToken,
      p_feria: "Todas las ferias",
      p_project_count: snapshot.projectCount,
      p_file_name: snapshot.fileName,
      p_pdf_base64: snapshot.pdfBase64,
      p_generated_at: snapshot.generatedAt
    }),
    renewLease: async (lease) => callRpc(supabaseUrl, secretKey, "renew_daily_results_pdf_archive", {
      p_session_token: sessionToken,
      p_evaluation_date: lease.evaluationDate,
      p_requested_generation: lease.requestedGeneration,
      p_lease_token: lease.leaseToken
    }),
    release: (lease) => callRpc(supabaseUrl, secretKey, "release_daily_results_pdf_archive", {
      p_session_token: sessionToken,
      p_evaluation_date: lease.evaluationDate,
      p_lease_token: lease.leaseToken
    })
  });
}
