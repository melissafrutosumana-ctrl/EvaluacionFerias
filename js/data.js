import { normalizeRoleName, fetchAllRpc } from "./utils.js?v=16.17";
import { areRowsEqual, isFullReconciliationDue, isSessionCacheFresh, mergeRowsById, readSessionCache, replaceRowsById, writeSessionCache } from "./cache.js?v=3.30";
import { sortProjectsByNewest } from "./project-order.js?v=1";

export { fetchAllRpc } from "./utils.js?v=16.17";

const EVALUATIONS_CACHE_KEY = "admin:evaluations";
const EVALUATIONS_CACHE_VERSION = 4;
const EVALUATIONS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const EVALUATIONS_SYNC_INTERVAL_MS = 15000;
const ADMIN_REFERENCE_SYNC_INTERVAL_MS = 60000;
const EVALUATIONS_FULL_RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
let evaluationsSyncTimer = null;
let evaluationsVisibilityHandler = null;
let evaluationsSyncPromise = null;
let adminReferenceSyncTimer = null;
let adminReferenceVisibilityHandler = null;
let adminReferenceSyncPromise = null;
let adminReferenceSnapshot = null;

function readEvaluationsCache() {
    const cache = readSessionCache(EVALUATIONS_CACHE_KEY);
    if (!cache || cache.version !== EVALUATIONS_CACHE_VERSION || cache.complete !== true || !Array.isArray(cache.rows) || !isSessionCacheFresh(cache, EVALUATIONS_CACHE_MAX_AGE_MS)) return null;
    return cache;
}

function getLatestEvaluationTimestamp(rows) {
    const timestamps = (rows ?? [])
        .map((row) => row?.updated_at ?? row?.created_at)
        .map((value) => Date.parse(value))
        .filter(Number.isFinite);

    return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();
}

function saveEvaluationsCache(rows, previousCache = null, fullyReconciled = false) {
    const syncedAt = Date.now();
    const nextCache = {
        version: EVALUATIONS_CACHE_VERSION,
        complete: true,
        rowCount: rows.length,
        rows,
        syncedAt,
        lastFullSyncAt: fullyReconciled ? syncedAt : previousCache?.lastFullSyncAt,
        cursor: getLatestEvaluationTimestamp(rows) ?? previousCache?.cursor
    };
    writeSessionCache(EVALUATIONS_CACHE_KEY, nextCache);
    return nextCache;
}

async function fetchAllEvaluationsFromServer() {
    const rows = await fetchAllRpc("get_evaluations");
    return saveEvaluationsCache(rows, null, true).rows;
}

async function syncEvaluationsFromServer() {
    if (evaluationsSyncPromise) return evaluationsSyncPromise;

    evaluationsSyncPromise = (async() => {
        const cache = readEvaluationsCache();
        if (!cache) {
            const rows = await fetchAllEvaluationsFromServer();
            return { rows, changed: true };
        }

        if (isFullReconciliationDue(cache, EVALUATIONS_FULL_RECONCILIATION_INTERVAL_MS)) {
            const serverRows = await fetchAllRpc("get_evaluations");
            const reconciliation = replaceRowsById(cache.rows, serverRows);
            const rows = saveEvaluationsCache(reconciliation.rows, cache, true).rows;
            return { rows, changed: reconciliation.changed };
        }

        const changedRows = await fetchAllRpc("get_evaluations_since", {
            p_since: cache.cursor ?? new Date(0).toISOString()
        });

        if (!changedRows.length) {
            writeSessionCache(EVALUATIONS_CACHE_KEY, { ...cache, syncedAt: Date.now() });
            return { rows: cache.rows, changed: false };
        }

        const rows = mergeRowsById(cache.rows, changedRows)
            .sort((left, right) => {
                const leftDate = Date.parse(left.updated_at ?? left.created_at ?? "") || 0;
                const rightDate = Date.parse(right.updated_at ?? right.created_at ?? "") || 0;
                return rightDate - leftDate || Number(right.id) - Number(left.id);
            });

        return { rows: saveEvaluationsCache(rows, cache).rows, changed: true };
    })().finally(() => {
        evaluationsSyncPromise = null;
    });

    return evaluationsSyncPromise;
}

export async function loadProjects(feriaType = "") {
    const projects = await fetchAllRpc("get_projects");

    const orderedProjects = sortProjectsByNewest(projects);

    if (!feriaType) {
        return orderedProjects;
    }

    return orderedProjects.filter((item) => String(item.tipo_feria ?? "") === feriaType);
}

export async function loadJudges(feriaType = "") {
    const [users, roles] = await Promise.all([
        fetchAllRpc("get_users"),
        fetchAllRpc("get_roles")
    ]);

    const roleNamesById = new Map(roles.map((role) => [role.id, normalizeRoleName(role.nombre)]));

    return users.filter((item) => {
        const isJudge = roleNamesById.get(item.role_id) === "Juez";
        const feriaMatches = !feriaType || String(item.tipo_feria ?? "") === feriaType;
        return isJudge && feriaMatches;
    });
}

export async function loadJudgeAssignments() {
    return fetchAllRpc("get_assignments");
}

export async function loadAssignedProjectsForJudge() {
    const data = await fetchAllRpc("get_judge_projects");

    return data.map((item) => ({
        ...item,
        tipo_evaluacion: item.tipo_evaluacion ?? "Exposición"
    }));
}

export async function loadUsers() {
    return fetchAllRpc("get_users");
}

export async function fetchAllEvaluations() {
    const cache = readEvaluationsCache();
    if (cache) return cache.rows;
    return fetchAllEvaluationsFromServer();
}

export function startEvaluationsSync(onUpdate) {
    stopEvaluationsSync();

    const sync = async() => {
        if (document.visibilityState === "hidden") return;

        try {
            const result = await syncEvaluationsFromServer();
            if (result.changed) onUpdate?.(result.rows);
        } catch (error) {
            console.warn("No se pudo sincronizar el caché de evaluaciones.", error);
        }
    };

    void sync();
    evaluationsSyncTimer = window.setInterval(sync, EVALUATIONS_SYNC_INTERVAL_MS);
    evaluationsVisibilityHandler = () => {
        if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", evaluationsVisibilityHandler);
}

export function startAdminReferenceDataSync(onUpdate, currentSnapshot = null) {
    stopAdminReferenceDataSync();
    adminReferenceSnapshot = currentSnapshot;

    const sync = async() => {
        if (document.visibilityState === "hidden" || adminReferenceSyncPromise) return;

        adminReferenceSyncPromise = Promise.all([loadProjects(), loadJudgeAssignments()])
            .then(([projects, assignments]) => {
                if (areRowsEqual(adminReferenceSnapshot?.projects, projects) && areRowsEqual(adminReferenceSnapshot?.assignments, assignments)) return;
                adminReferenceSnapshot = { projects, assignments };
                onUpdate?.(projects, assignments);
            })
            .catch((error) => {
                console.warn("No se pudieron sincronizar proyectos y asignaciones.", error);
            })
            .finally(() => {
                adminReferenceSyncPromise = null;
            });

        await adminReferenceSyncPromise;
    };

    adminReferenceSyncTimer = window.setInterval(sync, ADMIN_REFERENCE_SYNC_INTERVAL_MS);
    adminReferenceVisibilityHandler = () => {
        if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", adminReferenceVisibilityHandler);
}

export function stopAdminReferenceDataSync() {
    if (adminReferenceSyncTimer) {
        window.clearInterval(adminReferenceSyncTimer);
        adminReferenceSyncTimer = null;
    }

    if (adminReferenceVisibilityHandler) {
        document.removeEventListener("visibilitychange", adminReferenceVisibilityHandler);
        adminReferenceVisibilityHandler = null;
    }
}

export function stopEvaluationsSync() {
    if (evaluationsSyncTimer) {
        window.clearInterval(evaluationsSyncTimer);
        evaluationsSyncTimer = null;
    }

    if (evaluationsVisibilityHandler) {
        document.removeEventListener("visibilitychange", evaluationsVisibilityHandler);
        evaluationsVisibilityHandler = null;
    }
}
