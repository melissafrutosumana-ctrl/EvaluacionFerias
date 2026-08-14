import { supabase } from "./supabase.js";
import { normalizeRoleName } from "./utils.js";
import { getSession } from "./auth.js";

function sessionToken() {
    return getSession()?.session_token ?? "";
}

export async function loadProjects(feriaType = "") {
    const { data, error } = await supabase.rpc("get_projects", {
        p_session_token: sessionToken()
    });

    if (error) {
        throw error;
    }

    const projects = data ?? [];

    if (!feriaType) {
        return projects;
    }

    return projects.filter((item) => String(item.tipo_feria ?? "") === feriaType);
}

export async function loadJudges(feriaType = "") {
    const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.rpc("get_users", { p_session_token: sessionToken() }),
        supabase.rpc("get_roles", { p_session_token: sessionToken() })
    ]);

    if (usersError) {
        throw usersError;
    }

    if (rolesError) {
        throw rolesError;
    }

    const roleNamesById = new Map((roles ?? []).map((role) => [role.id, normalizeRoleName(role.nombre)]));

    return (users ?? []).filter((item) => {
        const isJudge = roleNamesById.get(item.role_id) === "Juez";
        const feriaMatches = !feriaType || String(item.tipo_feria ?? "") === feriaType;
        return isJudge && feriaMatches;
    });
}

export async function loadJudgeAssignments() {
    const { data, error } = await supabase.rpc("get_assignments", {
        p_session_token: sessionToken()
    });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function loadAssignedProjectsForJudge() {
    const { data, error } = await supabase.rpc("get_judge_projects", {
        p_session_token: sessionToken()
    });

    if (error) {
        throw error;
    }

    return (data ?? []).map((item) => ({
        ...item,
        tipo_evaluacion: item.tipo_evaluacion ?? "Exposición"
    }));
}

export async function loadUsers() {
    const { data, error } = await supabase.rpc("get_users", {
        p_session_token: sessionToken()
    });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function fetchAllEvaluations() {
    const { data, error } = await supabase.rpc("get_evaluations", {
        p_session_token: sessionToken()
    });

    if (error) {
        throw error;
    }

    return data ?? [];
}
