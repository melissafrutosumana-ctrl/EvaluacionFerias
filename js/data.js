import { supabase } from "./supabase.js";
import { normalizeRoleName } from "./utils.js";
import { getSession } from "./auth.js";

function sessionToken() {
    return getSession()?.session_token ?? "";
}

const RPC_PAGE_SIZE = 1000;

export async function fetchAllRpc(functionName, params = {}, pageSize = RPC_PAGE_SIZE) {
    const rows = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .rpc(functionName, params)
            .range(offset, offset + pageSize - 1);

        if (error) {
            throw error;
        }

        const page = data ?? [];
        rows.push(...page);

        if (page.length < pageSize) {
            return rows;
        }

        offset += pageSize;
    }
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
    const [users, rolesResult] = await Promise.all([
        fetchAllRpc("get_users", { p_session_token: sessionToken() }),
        supabase.rpc("get_roles", { p_session_token: sessionToken() })
    ]);

    if (rolesResult.error) {
        throw rolesResult.error;
    }

    const roleNamesById = new Map((rolesResult.data ?? []).map((role) => [role.id, normalizeRoleName(role.nombre)]));

    return (users ?? []).filter((item) => {
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
