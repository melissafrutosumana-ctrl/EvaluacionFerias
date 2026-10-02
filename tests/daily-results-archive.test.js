import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { buildDailyResultsRows, fetchDailySnapshotRows, retryPendingDailyResultsArchives, runDailyResultsArchiveWorker } from "../server/daily-results-archive.js";
import { getArchiveEvaluationDates, resolveArchivePageResults } from "../js/results-pdf-archives.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("daily snapshot RPC passes the judge session and drains stable offset pages", async () => {
  const offsets = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/rest/v1/rpc/get_daily_results_pdf_snapshot");
    const params = JSON.parse(options.body);
    assert.equal(params.p_session_token, "judge-session");
    assert.equal(params.p_evaluation_date, "2026-10-01");
    assert.equal(params.p_limit, 500);
    offsets.push(params.p_offset);
    const count = params.p_offset === 0 ? 500 : 100;
    const page = Array.from({ length: count }, (_, index) => ({
      record_type: "project",
      row_id: params.p_offset + index + 1,
      row_data: { id: params.p_offset + index + 1 }
    }));
    return new Response(JSON.stringify(page), { status: 200 });
  };

  const rows = await fetchDailySnapshotRows({
    supabaseUrl: "https://project.supabase.co",
    secretKey: "sb_secret_test",
    sessionToken: "judge-session",
    evaluationDate: "2026-10-01"
  });

  assert.deepEqual(offsets, [0, 500]);
  assert.equal(rows.length, 600);
  assert.deepEqual(rows.map(({ row_id }) => row_id), Array.from({ length: 600 }, (_, index) => index + 1));
});

test("daily snapshot migration provides stable ordered pages and service-role-only execution", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261001000000_daily_results_pdf_archive_jobs.sql", import.meta.url), "utf8");
  const snapshotFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.get_daily_results_pdf_snapshot"));

  assert.match(snapshotFunction, /SECURITY DEFINER/);
  assert.match(snapshotFunction, /SET search_path = pg_catalog, public/);
  assert.match(snapshotFunction, /ORDER BY snapshot_rows\.kind, snapshot_rows\.id/);
  assert.match(snapshotFunction, /OFFSET p_offset\s+LIMIT p_limit/);
  assert.match(snapshotFunction, /p\.fecha_evaluacion = p_evaluation_date/);
  assert.match(snapshotFunction, /FROM public\.proyectos_ferias AS p/);
  assert.match(snapshotFunction, /FROM public\.asignaciones_jueces AS a\s+JOIN day_projects/);
  assert.match(snapshotFunction, /FROM public\.evaluaciones_proyectos AS e\s+JOIN day_projects/);
  assert.match(snapshotFunction, /GRANT EXECUTE ON FUNCTION public\.get_daily_results_pdf_snapshot\(TEXT, DATE, INTEGER, INTEGER\)\s+TO service_role/);
  assert.match(snapshotFunction, /REVOKE ALL ON FUNCTION public\.get_daily_results_pdf_snapshot\(TEXT, DATE, INTEGER, INTEGER\)\s+FROM PUBLIC, anon, authenticated/);
  assert.match(snapshotFunction, /FROM public\.asignaciones_jueces/);
  assert.match(snapshotFunction, /JOIN day_projects/);
  for (const field of ["id", "titulo", "tipo_feria", "categoria_pronatecyt", "categoria_expotecnica", "categoria_festival", "puntaje_escrito_manual"]) {
    assert.match(snapshotFunction, new RegExp(`'${field}', p\\.${field}`));
  }
  for (const field of ["id", "proyecto_id", "juez_id", "tipo_evaluacion"]) {
    assert.match(snapshotFunction, new RegExp(`'${field}', a\\.${field}`));
  }
  for (const field of ["id", "proyecto_id", "juez_id", "nota", "tipo_evaluacion"]) {
    assert.match(snapshotFunction, new RegExp(`'${field}', e\\.${field}`));
  }
  assert.doesNotMatch(snapshotFunction, /to_jsonb\s*\(/i);
});

test("daily recovery uses sessionless worker snapshot RPC and service-role-only SQL functions", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261002000000_daily_results_pdf_autonomous_retry.sql", import.meta.url), "utf8");
  for (const name of [
    "list_pending_daily_results_pdf_archives",
    "claim_daily_results_pdf_archive_worker",
    "renew_daily_results_pdf_archive_worker",
    "release_daily_results_pdf_archive_worker",
    "get_daily_results_pdf_snapshot_worker",
    "complete_daily_results_pdf_archive_worker",
    "acknowledge_empty_daily_results_pdf_archive_worker"
  ]) {
    const index = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
    assert.notEqual(index, -1, `${name} exists`);
    const functionSource = migration.slice(index, migration.indexOf("$$;", index) + 3);
    assert.match(functionSource, /SECURITY DEFINER/);
    assert.match(migration.slice(index), new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+FROM PUBLIC, anon, authenticated`));
    assert.match(migration.slice(index), new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]+TO service_role`));
  }
  assert.match(migration, /ORDER BY snapshot_rows\.kind, snapshot_rows\.id\s+OFFSET p_offset\s+LIMIT p_limit/);
  assert.match(migration, /WHERE job\.requested_generation > job\.processed_generation/);
  assert.match(migration, /SET processed_generation = p_requested_generation,[\s\S]+?lease_token = NULL/);
  assert.doesNotMatch(migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.get_daily_results_pdf_snapshot_worker"), migration.indexOf("CREATE OR REPLACE FUNCTION public.complete_daily_results_pdf_archive_worker")), /app_sessions|p_session_token/);
  assert.match(migration, /IF p_project_count < 1/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.acknowledge_empty_daily_results_pdf_archive_worker/);
});

test("daily PDF row generation works with the restricted snapshot fields", () => {
  const rows = buildDailyResultsRows(
    [{ id: 101, titulo: "Proyecto de prueba", tipo_feria: "Otra feria" }],
    [{ id: 201, proyecto_id: 101, juez_id: 301, tipo_evaluacion: "Exposición" }],
    [{ id: 401, proyecto_id: 101, juez_id: 301, nota: 80, tipo_evaluacion: "Exposición" }]
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].project, "Proyecto de prueba");
  assert.equal(rows[0].status, "Completa");
  assert.equal(rows[0].expo, "80.00");
});

test("daily snapshot fails closed when its service-role RPC is unavailable", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: "PGRST106", message: "function not exposed" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });

  await assert.rejects(fetchDailySnapshotRows({
    supabaseUrl: "https://project.supabase.co",
    secretKey: "sb_secret_test",
    sessionToken: "judge-session",
    evaluationDate: "2026-10-01"
  }), /function not exposed/);
});

function createQueue() {
  const queue = { generation: 0, processed: 0, lease: null, saved: [], sourceProjectId: null };
  return {
    queue,
    enqueue: async (projectId) => {
      queue.generation++;
      queue.sourceProjectId = projectId;
      return { evaluationDate: "2026-10-01" };
    },
    claim: async (evaluationDate) => {
      if (queue.lease || queue.processed >= queue.generation) return null;
      queue.lease = {
        evaluationDate,
        sourceProjectId: queue.sourceProjectId,
        requestedGeneration: queue.generation,
        leaseToken: crypto.randomUUID()
      };
      return queue.lease;
    },
    complete: async (lease, snapshot) => {
      if (queue.lease?.leaseToken !== lease.leaseToken) return false;
      if (queue.generation !== lease.requestedGeneration) {
        queue.lease = null;
        return false;
      }
      queue.saved.push(snapshot.generation);
      queue.processed = lease.requestedGeneration;
      queue.lease = null;
      return true;
    },
    release: async (lease) => {
      if (queue.lease?.leaseToken === lease.leaseToken) queue.lease = null;
    }
  };
}

test("concurrent same-day requests coalesce into one build of the newest generation", async () => {
  const database = createQueue();
  let waitingWorkers = 0;
  let releaseQuietPeriod;
  const quietPeriod = new Promise((resolve) => { releaseQuietPeriod = resolve; });
  let buildCount = 0;
  const worker = () => runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    waitForQuietPeriod: async () => {
      waitingWorkers++;
      if (waitingWorkers === 2) releaseQuietPeriod();
      await quietPeriod;
    },
    build: async (lease) => {
      buildCount++;
      return { generation: lease.requestedGeneration };
    }
  });

  await Promise.all([worker(), worker()]);

  assert.equal(database.queue.generation, 2);
  assert.equal(database.queue.processed, 2);
  assert.equal(buildCount, 1);
  assert.deepEqual(database.queue.saved, [2]);
});

test("a request arriving during a build prevents its stale PDF from being acknowledged", async () => {
  const database = createQueue();
  let finishFirstBuild;
  let firstBuildStarted;
  const buildStarted = new Promise((resolve) => { firstBuildStarted = resolve; });
  const firstBuild = new Promise((resolve) => { finishFirstBuild = resolve; });
  let buildCount = 0;
  const worker = (build) => runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    waitForQuietPeriod: async () => {},
    build
  });

  const firstRun = worker(async (lease) => {
    buildCount++;
    firstBuildStarted();
    await firstBuild;
    return { generation: lease.requestedGeneration };
  });
  await buildStarted;
  const secondRun = await worker(async (lease) => ({ generation: lease.requestedGeneration }));
  assert.equal(secondRun.reason, "leased-or-not-quiet");
  finishFirstBuild();
  const firstResult = await firstRun;

  assert.equal(firstResult.processed, true);
  assert.equal(buildCount, 2);
  assert.equal(database.queue.generation, 2);
  assert.equal(database.queue.processed, 2);
  assert.deepEqual(database.queue.saved, [2]);
});

test("a heartbeat keeps the lease while a newer generation makes the active build stale", async () => {
  const database = createQueue();
  let finishFirstBuild;
  let firstBuildStarted;
  const buildStarted = new Promise((resolve) => { firstBuildStarted = resolve; });
  const firstBuild = new Promise((resolve) => { finishFirstBuild = resolve; });
  let heartbeatCount = 0;
  let buildCount = 0;
  const firstRun = runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    waitForQuietPeriod: async () => {},
    heartbeatIntervalMs: 1,
    renewLease: async (lease) => {
      heartbeatCount++;
      return database.queue.lease?.leaseToken === lease.leaseToken;
    },
    build: async (lease) => {
      buildCount++;
      if (lease.requestedGeneration === 1) {
        firstBuildStarted();
        await firstBuild;
      }
      return { generation: lease.requestedGeneration };
    }
  });
  await buildStarted;
  const secondRun = await runDailyResultsArchiveWorker({
    projectId: 22,
    ...database,
    waitForQuietPeriod: async () => {},
    build: async (lease) => ({ generation: lease.requestedGeneration })
  });
  assert.equal(secondRun.reason, "leased-or-not-quiet");
  await new Promise((resolve) => setTimeout(resolve, 8));
  finishFirstBuild();
  const firstResult = await firstRun;

  assert.equal(heartbeatCount > 0, true);
  assert.equal(firstResult.processed, true);
  assert.equal(buildCount, 2);
  assert.deepEqual(database.queue.saved, [2]);
});

test("two judges on separate projects of the same day can share the first judge's active worker", async () => {
  const database = createQueue();
  let finishFirstBuild;
  let firstBuildStarted;
  const buildStarted = new Promise((resolve) => { firstBuildStarted = resolve; });
  const firstBuild = new Promise((resolve) => { finishFirstBuild = resolve; });
  const assignments = new Map([["judge-a", new Set([19])], ["judge-b", new Set([22])]]);
  const completedBy = [];
  const runAs = (sessionToken, projectId, build) => runDailyResultsArchiveWorker({
    projectId,
    ...database,
    waitForQuietPeriod: async () => {},
    build,
    complete: async (lease, snapshot) => {
      assert.equal(assignments.has(sessionToken), true);
      const sourceProjectId = snapshot.sourceProjectId ?? lease.sourceProjectId;
      completedBy.push({ sessionToken, sourceProjectId, sourceWasAssigned: assignments.get(sessionToken).has(sourceProjectId) });
      return database.complete(lease, snapshot);
    }
  });

  const judgeA = runAs("judge-a", 19, async (lease) => {
    if (lease.requestedGeneration === 1) {
      firstBuildStarted();
      await firstBuild;
    }
    return { generation: lease.requestedGeneration, sourceProjectId: lease.sourceProjectId };
  });
  await buildStarted;
  const judgeB = await runAs("judge-b", 22, async (lease) => ({ generation: lease.requestedGeneration, sourceProjectId: lease.sourceProjectId }));
  assert.equal(judgeB.reason, "leased-or-not-quiet");
  finishFirstBuild();
  await judgeA;

  assert.deepEqual(database.queue.saved, [2]);
  assert.deepEqual(completedBy, [
    { sessionToken: "judge-a", sourceProjectId: 19, sourceWasAssigned: true },
    { sessionToken: "judge-a", sourceProjectId: 22, sourceWasAssigned: false }
  ]);
});

test("failed archive builds release the lease and keep the generation pending for a later request", async () => {
  const database = createQueue();

  await assert.rejects(runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    waitForQuietPeriod: async () => {},
    build: async () => { throw new Error("transient PDF error"); }
  }), /transient PDF error/);

  assert.equal(database.queue.lease, null);
  assert.equal(database.queue.processed, 0);
  assert.equal(database.queue.generation, 1);

  await runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    waitForQuietPeriod: async () => {},
    build: async (lease) => ({ generation: lease.requestedGeneration })
  });
  assert.equal(database.queue.processed, 2);
  assert.deepEqual(database.queue.saved, [2]);
});

test("immediate retries reuse one enqueued generation and one lease at a time", async () => {
  const database = createQueue();
  let buildCount = 0;
  let enqueueCount = 0;
  let claimCount = 0;
  const result = await runDailyResultsArchiveWorker({
    projectId: 19,
    ...database,
    enqueue: async (projectId) => {
      enqueueCount++;
      return database.enqueue(projectId);
    },
    claim: async (date) => {
      claimCount++;
      return database.claim(date);
    },
    retryCount: 2,
    waitForQuietPeriod: async () => {},
    build: async (lease) => {
      buildCount++;
      if (buildCount < 3) throw new Error("temporary failure");
      return { generation: lease.requestedGeneration };
    }
  });

  assert.equal(result.processed, true);
  assert.equal(enqueueCount, 1);
  assert.equal(database.queue.generation, 1);
  assert.equal(claimCount, 3);
  assert.equal(buildCount, 3);
  assert.deepEqual(database.queue.saved, [1]);
});

test("cron recovery processes a bounded pending date batch without an app session", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const rpc = new URL(url).pathname.split("/").at(-1);
    const params = JSON.parse(options.body);
    calls.push({ rpc, params });
    if (rpc === "list_pending_daily_results_pdf_archives") {
      assert.equal(params.p_limit, 14);
      return new Response(JSON.stringify([{ evaluation_date: "2026-10-01" }]), { status: 200 });
    }
    if (rpc === "claim_daily_results_pdf_archive_worker") {
      return new Response(JSON.stringify([{
        evaluation_date: "2026-10-01", source_project_id: 99, requested_generation: 4, lease_token: "lease-1"
      }]), { status: 200 });
    }
    if (rpc === "get_daily_results_pdf_snapshot_worker") {
      assert.equal("p_session_token" in params, false);
      assert.equal(params.p_evaluation_date, "2026-10-01");
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (rpc === "acknowledge_empty_daily_results_pdf_archive_worker") {
      return new Response("true", { status: 200 });
    }
    if (rpc === "renew_daily_results_pdf_archive_worker") {
      return new Response("true", { status: 200 });
    }
    assert.fail(`Unexpected RPC ${rpc}`);
  };

  const result = await retryPendingDailyResultsArchives({
    supabaseUrl: "https://project.supabase.co",
    secretKey: "sb_secret_test",
    now: () => 0
  });
  assert.deepEqual(result, { pending: 1, processed: ["2026-10-01"], failed: [], skipped: [] });
  assert.deepEqual(calls.map(({ rpc }) => rpc), [
    "list_pending_daily_results_pdf_archives",
    "claim_daily_results_pdf_archive_worker",
    "get_daily_results_pdf_snapshot_worker",
    "renew_daily_results_pdf_archive_worker",
    "acknowledge_empty_daily_results_pdf_archive_worker"
  ]);
  assert.equal(calls.some(({ params }) => JSON.stringify(params).includes("session_token")), false);
});

test("queue migration couples source changes and PDF persistence to generation acknowledgement", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261001000000_daily_results_pdf_archive_jobs.sql", import.meta.url), "utf8");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.daily_results_pdf_archive_jobs/);
  assert.match(migration, /AFTER INSERT OR UPDATE OR DELETE ON public\.evaluaciones_proyectos/);
  assert.match(migration, /AFTER UPDATE OF puntaje_escrito_manual ON public\.proyectos_ferias/);
  assert.match(migration, /requested_generation <> p_requested_generation/);
  assert.match(migration, /ON CONFLICT \(archive_key\) DO UPDATE/);
  assert.match(migration, /source_generation = EXCLUDED\.source_generation/);
  assert.match(migration, /processed_generation = p_requested_generation/);
  const enqueueFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.enqueue_daily_results_pdf_archive"), migration.indexOf("CREATE OR REPLACE FUNCTION public.claim_daily_results_pdf_archive"));
  const completeFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.complete_daily_results_pdf_archive"), migration.indexOf("-- Keep old Vercel instances"));
  const heartbeatFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.renew_daily_results_pdf_archive"), migration.indexOf("CREATE OR REPLACE FUNCTION public.complete_daily_results_pdf_archive"));
  assert.match(enqueueFunction, /asignaciones_jueces/);
  assert.doesNotMatch(completeFunction, /asignaciones_jueces/);
  assert.doesNotMatch(heartbeatFunction, /requested_generation = p_requested_generation/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.save_automatic_daily_results_pdf_archive/);
  assert.doesNotMatch(migration, /REVOKE EXECUTE ON FUNCTION public\.save_automatic_daily_results_pdf_archive/);
});

test("el corte diario calcula el puntaje oficial y deja sin final los proyectos pendientes", () => {
  const projects = [
    {
      id: 10,
      titulo: "Investigación del agua",
      tipo_feria: "Feria Cientifica y Tecnologica",
      categoria_pronatecyt: "F8B - Demostraciones Científicas y Tecnológicas",
      puntaje_escrito_manual: 60
    },
    {
      id: 20,
      titulo: "Prototipo STEAM",
      tipo_feria: "Feria Expotecnica",
      categoria_expotecnica: "DESAFIO STEAM"
    },
    {
      id: 30,
      titulo: "Proyecto pendiente de asignar",
      tipo_feria: "Festival Estudiantil de las Artes"
    }
  ];
  const assignments = [
    { proyecto_id: 10, juez_id: 1, tipo_evaluacion: "Exposición" },
    { proyecto_id: 10, juez_id: 2, tipo_evaluacion: "Exposición" },
    { proyecto_id: 20, juez_id: 3, tipo_evaluacion: "Exposición" },
    { proyecto_id: 20, juez_id: 4, tipo_evaluacion: "Exposición" }
  ];
  const evaluations = [
    { proyecto_id: 10, juez_id: 1, nota: 32, tipo_evaluacion: "Exposición" },
    { proyecto_id: 10, juez_id: 2, nota: 36, tipo_evaluacion: "Exposición" },
    { proyecto_id: 20, juez_id: 3, nota: 55, tipo_evaluacion: "Exposición" }
  ];

  const rows = buildDailyResultsRows(projects, assignments, evaluations);

  assert.deepEqual(rows.map(({ status, final }) => [status, final]), [
    ["Completa", "80.96"],
    ["Pendiente (1/2)", "—"],
    ["Sin asignaciones", "—"]
  ]);
  assert.equal(rows[0].written, "60.00");
  assert.equal(rows[1].expo, "55.00");
});

test("el selector del archivo conserva solo fechas válidas, únicas y ordenadas de proyectos", () => {
  assert.deepEqual(getArchiveEvaluationDates([
    { fecha_evaluacion: "2026-10-02" },
    { fecha_evaluacion: "2026-09-30" },
    { fecha_evaluacion: "2026-10-02" },
    { fecha_evaluacion: "2026-02-30" },
    { fecha_evaluacion: null }
  ]), ["2026-09-30", "2026-10-02"]);
});

test("el selector del archivo queda sin fechas cuando no hay proyectos", () => {
  assert.deepEqual(getArchiveEvaluationDates([]), []);
});

test("el fallo al cargar proyectos conserva los PDF y deja vacío el filtro de fechas", () => {
  const archives = [{ id: 7, evaluation_date: "2026-10-02" }];
  const result = resolveArchivePageResults(
    { status: "fulfilled", value: { data: archives, error: null } },
    { status: "rejected", reason: new Error("get_projects falló") }
  );

  assert.deepEqual(result.archives, archives);
  assert.deepEqual(result.projects, []);
  assert.equal(result.projectsUnavailable, true);
});
