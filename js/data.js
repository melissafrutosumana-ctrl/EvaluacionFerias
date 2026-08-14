import { supabase } from "./supabase.js";
import { isMissingColumnError, normalizeRoleName } from "./utils.js";

export async function loadProjects(feriaType = "") {
    const withMembers = await supabase
        .from("proyectos_ferias")
        .select("id, titulo, descripcion, tipo_feria, integrante_1, integrante_2, integrante_3, categoria_festival, subcategoria_festival, participacion, categoria_expotecnica, eje_tematico, categoria_pronatecyt")
        .order("titulo", { ascending: true });

    let projects = [];

    if (withMembers.error) {
        const needsFallback =
            isMissingColumnError(withMembers.error, "integrante_") ||
            isMissingColumnError(withMembers.error, "tipo_feria") ||
            isMissingColumnError(withMembers.error, "categoria_festival") ||
            isMissingColumnError(withMembers.error, "subcategoria_festival") ||
            isMissingColumnError(withMembers.error, "participacion") ||
            isMissingColumnError(withMembers.error, "categoria_expotecnica") ||
            isMissingColumnError(withMembers.error, "eje_tematico") ||
            isMissingColumnError(withMembers.error, "categoria_pronatecyt");

        if (!needsFallback) {
            throw withMembers.error;
        }

        const withFeriaOnly = await supabase
            .from("proyectos_ferias")
            .select("id, titulo, tipo_feria")
            .order("titulo", { ascending: true });

        if (!withFeriaOnly.error) {
            projects = (withFeriaOnly.data ?? []).map((item) => ({
                ...item,
                integrante_1: null,
                integrante_2: null,
                integrante_3: null,
                categoria_festival: null,
                subcategoria_festival: null,
                participacion: null,
                categoria_expotecnica: null,
                eje_tematico: null,
                categoria_pronatecyt: null
            }));
        } else {
            const fallback = await supabase.from("proyectos_ferias").select("id, titulo").order("titulo", { ascending: true });

            if (fallback.error) {
                throw fallback.error;
            }

            projects = (fallback.data ?? []).map((item) => ({
                ...item,
                tipo_feria: null,
                integrante_1: null,
                integrante_2: null,
                integrante_3: null,
                categoria_festival: null,
                subcategoria_festival: null,
                participacion: null,
                categoria_expotecnica: null,
                eje_tematico: null
            }));
        }
    } else {
        projects = withMembers.data ?? [];
    }

    if (!feriaType) {
        return projects;
    }

    return projects.filter((item) => String(item.tipo_feria ?? "") === feriaType);
}

export async function loadJudges(feriaType = "") {
    const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("usuarios").select("id, nombre, role_id, tipo_feria").order("nombre", { ascending: true }),
        supabase.from("roles").select("id, nombre")
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
    const { data, error } = await supabase
        .from("asignaciones_jueces")
        .select("juez_id, proyecto_id, tipo_evaluacion")
        .order("juez_id", { ascending: true })
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function loadAssignedProjectsForJudge(judgeId) {
    const { data: assignments, error: assignmentsError } = await supabase
        .from("asignaciones_jueces")
        .select("proyecto_id, tipo_evaluacion")
        .eq("juez_id", judgeId);

    if (assignmentsError) {
        throw assignmentsError;
    }

    const projectIds = [...new Set((assignments ?? []).map((item) => item.proyecto_id).filter(Boolean))];
    const tipoMap = new Map((assignments ?? []).map((a) => [a.proyecto_id, a.tipo_evaluacion ?? "Exposición"]));

    if (projectIds.length === 0) {
        return [];
    }

    const { data: projects, error: projectsError } = await supabase
        .from("proyectos_ferias")
        .select("id, titulo, tipo_feria, categoria_festival, subcategoria_festival, categoria_expotecnica, eje_tematico, categoria_pronatecyt")
        .in("id", projectIds)
        .order("titulo", { ascending: true });

    if (projectsError) {
        if (!isMissingColumnError(projectsError, "categoria_festival") &&
            !isMissingColumnError(projectsError, "subcategoria_festival") &&
            !isMissingColumnError(projectsError, "categoria_expotecnica") &&
            !isMissingColumnError(projectsError, "eje_tematico") &&
            !isMissingColumnError(projectsError, "categoria_pronatecyt")) {
            throw projectsError;
        }

        const fallback = await supabase
            .from("proyectos_ferias")
            .select("id, titulo, tipo_feria")
            .in("id", projectIds)
            .order("titulo", { ascending: true });

        if (fallback.error) {
            throw fallback.error;
        }

        return (fallback.data ?? []).map((item) => ({
            ...item,
            tipo_evaluacion: tipoMap.get(item.id) ?? "Exposición",
            categoria_festival: null,
            subcategoria_festival: null,
            categoria_expotecnica: null,
            eje_tematico: null,
            categoria_pronatecyt: null
        }));
    }

    return (projects ?? []).map((item) => ({
        ...item,
        tipo_evaluacion: tipoMap.get(item.id) ?? "Exposición"
    }));
}

export async function loadUsers() {
    const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, role_id, tipo_feria")
        .order("nombre", { ascending: true });

    if (error) {
        // Backward compatibility when DB migration for tipo_feria has not been executed yet.
        if (isMissingColumnError(error, "tipo_feria")) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from("usuarios")
                .select("id, nombre, role_id")
                .order("nombre", { ascending: true });

            if (fallbackError) {
                throw fallbackError;
            }

            return (fallbackData ?? []).map((item) => ({
                ...item,
                tipo_feria: null
            }));
        }

        throw error;
    }

    return data ?? [];
}

export async function fetchAllEvaluations() {
    const pageSize = 1000;
    let allRows = [];
    let start = 0;
    while (true) {
        const { data, error } = await supabase
            .from("evaluaciones_proyectos")
            .select("proyecto_id, juez_id, criterio, nota, tipo_evaluacion")
            .order("created_at", { ascending: false })
            .range(start, start + pageSize - 1);
        if (error) throw error;
        if (!data || !data.length) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        start += pageSize;
    }
    return allRows;
}
