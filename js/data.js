import { normalizeRoleName, fetchAllRpc } from "./utils.js";
import { getSession } from "./auth.js";

export { fetchAllRpc } from "./utils.js";

function sessionToken() {
    return getSession()?.session_token ?? "";
}

export async function loadProjects(feriaType = "") {
    const projects = await fetchAllRpc("get_projects", {
        p_session_token: sessionToken()
    });

    if (!feriaType) {
        return projects;
    }

    return projects.filter((item) => String(item.tipo_feria ?? "") === feriaType);
}

export async function loadJudges(feriaType = "") {
    const [users, roles] = await Promise.all([
        fetchAllRpc("get_users", { p_session_token: sessionToken() }),
        fetchAllRpc("get_roles", { p_session_token: sessionToken() })
    ]);

    const roleNamesById = new Map(roles.map((role) => [role.id, normalizeRoleName(role.nombre)]));

    return users.filter((item) => {
        const isJudge = roleNamesById.get(item.role_id) === "Juez";
        const feriaMatches = !feriaType || String(item.tipo_feria ?? "") === feriaType;
        return isJudge && feriaMatches;
    });
}

export async function loadJudgeAssignments() {
    return fetchAllRpc("get_assignments", {
        p_session_token: sessionToken()
    });
}

export async function loadAssignedProjectsForJudge() {
    const data = await fetchAllRpc("get_judge_projects", {
        p_session_token: sessionToken()
    });

    return data.map((item) => ({
        ...item,
        tipo_evaluacion: item.tipo_evaluacion ?? "Exposición"
    }));
}

export async function loadUsers() {
    return fetchAllRpc("get_users", {
        p_session_token: sessionToken()
    });
}

export async function fetchAllEvaluations() {
    return fetchAllRpc("get_evaluations", {
        p_session_token: sessionToken()
    });
}
