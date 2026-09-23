import { supabase } from "./supabase.js?v=1";
import { escapeHTML, showToast, setMessage, normalizeRoleName, fillSelect, setupHamburgerMenu, setupHideOnScroll, highlightActiveNavLink, buildFeriaOptions, FESTIVAL_FERIA_NAME, FESTIVAL_CATEGORIES, FESTIVAL_SUBCATEGORIES, FESTIVAL_EDUCATIONAL_LEVELS, EXPOTECNICA_CATEGORIES, EXPOTECNICA_EJES, PRONAFECYT_CATEGORIES, PRONAFECYT_EDUCATIONAL_CATEGORIES, PRONAFECYT_C_RAW_MAX, updateProjectFormFieldsByFeria, getResultCategoryGroupLabel, getFestivalProjectLabel, showSkeleton, confirmDialog, PRONAFECYT_BY_NIVEL, getNivelFromPronatecyt, calcAverage, calcFinalScore, calcPronatecytFinalScore, calcExpotecnicaFinalScore, openModalAccesible, closeModalAccesible, normalizeSearchText, paginateItems, getJudgeProgressLabel } from "./utils.js?v=16.15";
import { getSession, enforceRole, hashPassword, bindLogout } from "./auth.js?v=3.33";
import { loadProjects, loadJudgeAssignments, loadUsers, fetchAllEvaluations, fetchAllRpc, startEvaluationsSync } from "./data.js?v=3.31";
import { generateAdminPDF } from "./pdf.js?v=3.23";
import { icon } from "./icons.js?v=1";
import { CACHE_SCOPE, clearSessionCache } from "./cache.js?v=3.29";

let latestAdminReportData = null;
let resultsSearchTerm = "";
let resultsCurrentPage = 1;
const RESULTS_PAGE_SIZE = 20;

function formatEvaluationDate(value) {
    if (!value) return "Sin programar";
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function isAdminRole(roleId, roles) {
    const role = (roles ?? []).find((item) => Number(item.id) === Number(roleId));
    return normalizeRoleName(role?.nombre) === "administrador";
}

function updateUserFeriaField(form, roles) {
    if (!form) return;

    const roleSelect = form.querySelector('[name="role_id"]');
    const feriaSelect = form.querySelector('[name="tipo_feria"]');
    const feriaField = form.querySelector('[data-user-feria-field]');
    if (!roleSelect || !feriaSelect || !feriaField) return;

    const isAdmin = isAdminRole(roleSelect.value, roles);
    feriaField.hidden = isAdmin;
    feriaSelect.required = !isAdmin;
    feriaSelect.disabled = isAdmin;
    if (isAdmin) feriaSelect.value = "";
}

function renderUsersTable(users, roles) {
    const tbody = document.querySelector("[data-users-table]");
    const status = document.querySelector("[data-users-table-status]");

    if (!tbody) {
        return;
    }

    if (!users.length) {
        tbody.innerHTML = '<tr role="row"><td role="cell" colspan="4">No hay usuarios registrados.</td></tr>';
        setMessage(status, "", "info");
        return;
    }

    const roleNamesById = new Map((roles ?? []).map((role) => [role.id, normalizeRoleName(role.nombre)]));

    tbody.innerHTML = users
        .map((item) => {
            const roleName = roleNamesById.get(item.role_id) ?? "Sin rol";
            const roleClass = roleName === "administrador" ? "role-badge role-admin" : roleName === "Juez" ? "role-badge role-judge" : "role-badge";
            const feriaLabel = roleName === "administrador" ? "Acceso global" : (item.tipo_feria ?? "-");
            return `<tr role="row">
        <td role="cell" headers="users-name">${escapeHTML(item.nombre)}</td>
        <td role="cell" headers="users-role"><span class="${roleClass}">${escapeHTML(roleName)}</span></td>
        <td role="cell" headers="users-fair">${escapeHTML(feriaLabel)}</td>
        <td role="cell" headers="users-actions">
          <button class="table-action-btn edit-user-btn" data-edit-user="${escapeHTML(JSON.stringify({ id: item.id, nombre: item.nombre, role_id: item.role_id, tipo_feria: item.tipo_feria }))}">Editar</button>
          <button class="table-action-btn delete-user-btn" data-delete-user-id="${item.id}">Eliminar</button>
        </td>
      </tr>`;
        })
        .join("");

}

function renderProjectsManagementTable(projects) {
    const tbody = document.querySelector("[data-projects-table]");
    const status = document.querySelector("[data-projects-table-status]");

    if (!tbody) {
        return;
    }

    if (!projects.length) {
        tbody.innerHTML = '<tr role="row"><td role="cell" colspan="5">No hay proyectos registrados.</td></tr>';
        setMessage(status, "", "info");
        return;
    }

    tbody.innerHTML = projects
        .map(
            (item) => {
                const feriaType = String(item.tipo_feria ?? "");
                const isFestival = feriaType === FESTIVAL_FERIA_NAME;
                const isExpotecnica = feriaType === "Feria Expotecnica";
                const detailParts = [];

                if (isFestival) {
                    const category = String(item.categoria_festival ?? "").trim();
                    const subcategory = String(item.subcategoria_festival ?? "").trim();
                    const educationalLevel = String(item.nivel_educativo ?? "").trim();
                    const participation = String(item.participacion ?? "").trim();

                    if (category) {
                        detailParts.push(["Categoría", category]);
                    }

                    if (subcategory) {
                        detailParts.push(["Subcategoría", subcategory]);
                    }

                    if (educationalLevel) {
                        detailParts.push(["Nivel educativo", educationalLevel]);
                    }

                    if (participation) {
                        detailParts.push(["Participación", participation]);
                    }

                } else if (isExpotecnica) {
                    const category = String(item.categoria_expotecnica ?? "").trim();
                    const eje = String(item.eje_tematico ?? "").trim();

                    if (category) {
                        detailParts.push(["Categoría", category]);
                    }

                    if (eje) {
                        detailParts.push(["Eje temático", eje]);
                    }

                } else if (feriaType === "Feria Cientifica y Tecnologica") {
                    const pronatecyt = String(item.categoria_pronatecyt ?? "").trim();
                    const educationalCategory = String(item.nivel_educativo ?? "").trim();
                    const integrantes = [item.integrante_1, item.integrante_2, item.integrante_3]
                        .map((name) => String(name ?? "").trim())
                        .filter(Boolean);

                    if (pronatecyt) {
                        detailParts.push(["PRONAFECYT", pronatecyt]);
                    }
                    if (educationalCategory) {
                        detailParts.push(["Categoría educativa", educationalCategory]);
                    }
                    if (integrantes.length) {
                        detailParts.push(["Integrantes", integrantes.join(", ")]);
                    }
                } else {
                    const integrantes = [item.integrante_1, item.integrante_2, item.integrante_3]
                        .map((name) => String(name ?? "").trim())
                        .filter(Boolean);
                    if (integrantes.length) detailParts.push(["Integrantes", integrantes.join(", ")]);
                }

                detailParts.push(["Evaluación", formatEvaluationDate(item.fecha_evaluacion)]);
                const detailHtml = detailParts.length ?
                    `<div class="project-detail-list">${detailParts.map(([label, value]) => `<div class="project-detail-row"><span class="project-detail-label">${escapeHTML(label)}</span><span class="project-detail-value">${escapeHTML(value || "-")}</span></div>`).join("")}</div>` :
                    "-";

                return `
        <tr role="row">
          <td role="cell" headers="managed-project-title">${escapeHTML(item.titulo)}</td>
          <td role="cell" headers="managed-project-fair">${escapeHTML(item.tipo_feria ?? "-")}</td>
          <td role="cell" class="project-detail-cell" headers="managed-project-details">${detailHtml}</td>
          <td role="cell" headers="managed-project-id">${item.id}</td>
          <td role="cell" headers="managed-project-actions">
            <button class="table-action-btn edit-project-btn" data-project-id="${item.id}">Editar</button>
            <button class="table-action-btn delete-project-btn" data-delete-project-id="${item.id}">Eliminar</button>
          </td>
        </tr>
      `;
            }
        )
        .join("");

}

function getAllowedRolesForUserForm(roles) {
    const roleList = roles ?? [];
    const judgeRole = roleList.find((role) => normalizeRoleName(role.nombre) === "Juez") ?? null;
    const adminRole = roleList.find((role) => normalizeRoleName(role.nombre) === "administrador") ?? null;
    const allowed = [];

    if (adminRole) {
        allowed.push({
            id: adminRole.id,
            nombre: "Admin"
        });
    }

    if (judgeRole) {
        allowed.push({
            id: judgeRole.id,
            nombre: "Juez"
        });
    }

    return allowed;
}


function renderAdminEvaluationsTable(rows, usersById, projectsById) {
    const container = document.querySelector("[data-admin-evaluations]");

    if (!container) {
        return;
    }

    const matchingRows = resultsSearchTerm ? rows.filter((row) =>
        normalizeSearchText(projectsById.get(row.proyecto_id)?.titulo).includes(resultsSearchTerm)
    ) : rows;

    if (!matchingRows.length) {
        const message = rows.length ?
            "No hay evaluaciones que coincidan con la búsqueda." :
            "No hay evaluaciones para los proyectos del filtro seleccionado.";
        container.innerHTML = `<p class="form-status">${message}</p>`;
        return;
    }

    // Group rows by project
    const grouped = new Map();
    rows.forEach((row) => {
        const pid = row.proyecto_id;
        if (!grouped.has(pid)) {
            grouped.set(pid, { title: projectsById.get(pid) ?.titulo ?? "Proyecto", rows: [] });
        }
        grouped.get(pid).rows.push(row);
    });

    const projectIds = [...grouped.keys()];

    // Build tabs
    const tabBar = document.createElement("div");
    tabBar.className = "eval-tab-bar";
    tabBar.setAttribute("role", "tablist");
    tabBar.setAttribute("aria-label", "Proyectos con evaluaciones");

    const panels = document.createElement("div");
    panels.className = "eval-tab-panels";

    projectIds.forEach((pid, i) => {
        const data = grouped.get(pid);
        const isActive = i === 0;

        const btn = document.createElement("button");
        btn.className = `eval-tab${isActive ? " active" : ""}`;
        btn.dataset.evalTab = pid;
        btn.id = `eval-tab-${pid}`;
        btn.type = "button";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", String(isActive));
        btn.setAttribute("aria-controls", `eval-panel-${pid}`);
        btn.tabIndex = isActive ? 0 : -1;
        btn.textContent = data.title;
        tabBar.appendChild(btn);

        const panel = document.createElement("div");
        panel.className = `eval-tab-panel${isActive ? " active" : ""}`;
        panel.dataset.evalPanel = pid;
        panel.id = `eval-panel-${pid}`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", `eval-tab-${pid}`);
        panel.hidden = !isActive;
        panel.tabIndex = 0;

        const tableWrap = document.createElement("div");
        tableWrap.className = "table-wrap";

        const JUDGE_CSS_VARS = [
            "var(--judge-1)", "var(--judge-2)", "var(--judge-3)", "var(--judge-4)", "var(--judge-5)",
            "var(--judge-6)", "var(--judge-7)", "var(--judge-8)", "var(--judge-9)", "var(--judge-10)"
        ];
        const colorMap = new Map();
        const judgeIds = [...new Set(data.rows.map((r) => r.juez_id))].sort();
        judgeIds.forEach((jid, i) => colorMap.set(jid, JUDGE_CSS_VARS[i % JUDGE_CSS_VARS.length]));

        // Sort rows by judge so each judge's criteria appear together
        const sortedRows = [...data.rows].sort((a, b) => {
            const orderA = judgeIds.indexOf(a.juez_id);
            const orderB = judgeIds.indexOf(b.juez_id);
            return orderA - orderB;
        });

    const table = document.createElement("table");
    table.className = "results-table eval-table";
        table.setAttribute("role", "table");
        table.innerHTML = `<thead role="rowgroup"><tr role="row"><th id="eval-judge-${pid}" role="columnheader" scope="col">Juez</th><th id="eval-criterion-${pid}" role="columnheader" scope="col">Criterio</th><th id="eval-score-${pid}" role="columnheader" scope="col">Nota</th></tr></thead>`;

        const tbody = document.createElement("tbody");
        tbody.setAttribute("role", "rowgroup");
        let lastJuez = null;
        tbody.innerHTML = sortedRows
            .map((row) => {
                const judgeName = usersById.get(row.juez_id) ?.nombre ?? "Juez";
                const color = colorMap.get(row.juez_id) ?? "#6b7280";
                const isFirstOfJudge = row.juez_id !== lastJuez;
                lastJuez = row.juez_id;
                return `<tr role="row" class="eval-judge-row${isFirstOfJudge ? " eval-judge-first" : ""}" style="--judge-color:${color}"><td role="cell" headers="eval-judge-${pid}"><span class="role-badge judge-color-badge" style="background:${color}18;color:${color};border-color:${color}33">${escapeHTML(judgeName)}</span></td><td role="cell" headers="eval-criterion-${pid}">${escapeHTML(row.criterio)}</td><td role="cell" class="eval-nota-cell" headers="eval-score-${pid}">${row.nota}</td></tr>`;
            })
            .join("");

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        panel.appendChild(tableWrap);
        panels.appendChild(panel);
    });

    container.innerHTML = "";
    container.appendChild(tabBar);
    container.appendChild(panels);

    // Tab switching
    tabBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".eval-tab");
        if (!btn) return;

        activateEvaluationTab(btn);
    });

    function activateEvaluationTab(btn) {
        if (!btn) return;
        const pid = btn.dataset.evalTab;
        tabBar.querySelectorAll(".eval-tab").forEach((tab) => {
            const active = tab === btn;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
            tab.tabIndex = active ? 0 : -1;
        });
        panels.querySelectorAll(".eval-tab-panel").forEach((panel) => {
            const active = panel.dataset.evalPanel === pid;
            panel.classList.toggle("active", active);
            panel.hidden = !active;
        });
    }

    tabBar.addEventListener("keydown", (event) => {
        const tabs = [...tabBar.querySelectorAll('[role="tab"]')];
        const currentTab = event.target.closest('[role="tab"]');
        const currentIndex = tabs.indexOf(currentTab);
        if (currentIndex < 0) return;
        let nextIndex = currentIndex;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[nextIndex].focus();
        activateEvaluationTab(tabs[nextIndex]);
    });
}

function renderAdminProjectsTable(projects, rows, selectedFeria = "") {
    const tbody = document.querySelector("[data-admin-projects]");

    if (!tbody) {
        return;
    }

    const filteredProjects = resultsSearchTerm ?
        projects.filter((project) => normalizeSearchText(project.titulo).includes(resultsSearchTerm)) :
        projects;

    if (!filteredProjects.length) {
        const message = projects.length ?
            "No hay proyectos que coincidan con la búsqueda." :
            selectedFeria ? "No hay proyectos registrados para la feria seleccionada." : "No hay proyectos registrados en ninguna feria.";
        tbody.innerHTML = `<tr role="row"><td role="cell" colspan="3">${message}</td></tr>`;
        return;
    }

    const evaluationCounts = new Map();
    rows.forEach((row) => {
        if (!evaluationCounts.has(row.proyecto_id)) evaluationCounts.set(row.proyecto_id, new Set());
        evaluationCounts.get(row.proyecto_id).add(String(row.criterio ?? ""));
    });

    tbody.innerHTML = filteredProjects
        .map((project) => {
            const count = evaluationCounts.get(project.id)?.size ?? 0;
            const evaluationStatus = count ? `${count} criterios calificados` : "Sin evaluaciones";
            return `<tr role="row"><td role="cell" headers="admin-project-name">${escapeHTML(project.titulo ?? "Proyecto")}</td><td role="cell" headers="admin-project-status"><span class="evaluation-status${count ? " is-complete" : " is-pending"}">${evaluationStatus}</span></td><td role="cell" headers="admin-project-id">${escapeHTML(String(project.id))}</td></tr>`;
        })
        .join("");
}


const JUDGE_VOTED_ICON = '<svg class="judge-icon voted-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
const JUDGE_PENDING_ICON = '<svg class="judge-icon pending-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>';

function formatJudgeEntry(judge) {
    if (judge.voted) {
        return `<span class="judge-voted">${JUDGE_VOTED_ICON} ${escapeHTML(judge.judgeName)} (${judge.sum})</span>`;
    }
    return `<span class="judge-pending">${JUDGE_PENDING_ICON} ${escapeHTML(judge.judgeName)} (pendiente)</span>`;
}

function formatJudgeColumn(judges, votedCount, totalCount) {
    if (!judges.length) return "<span class=\"judge-empty\">—</span>";
    const list = judges.map(formatJudgeEntry).join(", ");
    if (totalCount > 0) {
        return `${list} <span class="judge-status">${votedCount}/${totalCount}</span>`;
    }
    return list;
}

function renderAdminScoresTable(rows, projectsById, assignmentsByProject, selectedFeria) {
    const tbody = document.querySelector("[data-project-results]");
    if (!tbody) return;
    const pagination = document.querySelector("[data-results-pagination]");

    const votedSet = new Set();
    const scoreMap = new Map();
    rows.forEach((row) => {
        const tipo = row.tipo_evaluacion ?? "Exposición";
        const key = `${row.proyecto_id}-${row.juez_id}-${tipo}`;
        votedSet.add(key);
        const nota = Number(row.nota);
        if (!Number.isNaN(nota)) {
            scoreMap.set(key, (scoreMap.get(key) || 0) + nota);
        }
    });

    if (!projectsById ?.size) {
        tbody.innerHTML = `<tr role="row"><td role="cell" colspan="4">${selectedFeria ? "No hay proyectos para la feria seleccionada." : "No hay proyectos registrados en ninguna feria."}</td></tr>`;
        if (pagination) pagination.innerHTML = "";
        const highScoreEl = document.querySelector("[data-highest-score]");
        if (highScoreEl) highScoreEl.textContent = "—";
        return;
    }

    const results = [];

    for (const [projectId, proj] of projectsById) {
        const assignedJudges = assignmentsByProject ?.get(projectId) ?? [];

        const expoJudges = [];
        const escritoJudges = [];
        let expoVoted = 0,
            expoTotal = 0;
        let escritoVoted = 0,
            escritoTotal = 0;

        assignedJudges.forEach((aj) => {
            const tipo = aj.tipo_evaluacion ?? "Exposición";
            const key = `${projectId}-${aj.juez_id}-${tipo}`;
            const voted = votedSet.has(key);
            const entry = { judgeName: aj.judgeName, sum: scoreMap.get(key) || 0, voted };

            if (aj.tipo_evaluacion === "Escrito") {
                escritoJudges.push(entry);
                escritoTotal++;
                if (voted) escritoVoted++;
            } else {
                expoJudges.push(entry);
                expoTotal++;
                if (voted) expoVoted++;
            }
        });

        const expoAvg = calcAverage(expoJudges);
        const escritoAvg = calcAverage(escritoJudges);

        const cat = proj ?.tipo_feria === "Feria Cientifica y Tecnologica" ?
            (proj ?.categoria_pronatecyt || "Sin categoría") :
            (proj ?.categoria_expotecnica ?? proj ?.categoria_festival ?? null);
        const isScientific = proj ?.tipo_feria === "Feria Cientifica y Tecnologica";
        const isExpotecnica = proj ?.tipo_feria === "Feria Expotecnica";
        const writtenMax = isScientific ?
            (PRONAFECYT_C_RAW_MAX[String(proj ?.categoria_pronatecyt || "").split(" ")[0].replace("B", "C")] || 0) :
            (isExpotecnica ? ({ "DESAFIO STEAM": 105, "EMPRENDIMIENTO E INNOVACION": 72 }[proj ?.categoria_expotecnica] || 0) : 0);
        const manualEscrito = writtenMax > 0 && proj ?.puntaje_escrito_manual != null ? Number(proj.puntaje_escrito_manual) : null;
        const escritoAvgFinal = manualEscrito !== null ? manualEscrito : escritoAvg;
        const escritoVotedFinal = manualEscrito !== null ? 1 : escritoVoted;
        const evaluationComplete =
            (expoTotal === 0 || expoVoted === expoTotal) &&
            (manualEscrito !== null || escritoTotal === 0 || escritoVoted === escritoTotal);

        let finalScore;
        if (isScientific) {
            const bCode = String(proj ?.categoria_pronatecyt || "").split(" ")[0];
            const expoPts = expoAvg;
            const escritoPts = manualEscrito !== null ? manualEscrito : escritoAvg;
            finalScore = calcPronatecytFinalScore(bCode, expoPts, escritoPts);
        } else if (isExpotecnica) {
            const expoPts = expoAvg;
            const escritoPts = manualEscrito !== null ? manualEscrito : escritoAvg;
            finalScore = calcExpotecnicaFinalScore(proj ?.categoria_expotecnica, expoPts, escritoPts);
        } else if (manualEscrito !== null) {
            finalScore = expoVoted > 0 ? expoAvg + manualEscrito : manualEscrito;
        } else {
            finalScore = calcFinalScore(expoVoted, expoAvg, escritoVotedFinal, escritoAvgFinal);
        }

        results.push({
            projectId,
            projectName: proj ?.titulo ?? "Proyecto",
            feria: proj ?.tipo_feria ?? "Feria",
            categoria: cat,
            subcategoria: proj ?.tipo_feria === FESTIVAL_FERIA_NAME ? (proj ?.subcategoria_festival || "Sin subcategoría") : "",
            nivel: proj ?.tipo_feria === FESTIVAL_FERIA_NAME ? (proj ?.nivel_educativo || "Sin nivel") : "",
            writtenMax,
            manualEscrito,
            expoJudges,
            escritoJudges,
            expoTotal,
            expoVoted,
            escritoTotal,
            escritoVoted,
            evaluationComplete,
            finalScore
        });
    }

    results.sort((a, b) => b.finalScore - a.finalScore);

    const highScoreEl = document.querySelector("[data-highest-score]");
    if (highScoreEl && results.length > 0) {
        highScoreEl.textContent = results[0].finalScore.toFixed(0);
    }

    const matchingResults = resultsSearchTerm ? results.filter((result) =>
        normalizeSearchText(result.projectName).includes(resultsSearchTerm)
    ) : results;
    const pageData = paginateItems(matchingResults, resultsCurrentPage, RESULTS_PAGE_SIZE);
    resultsCurrentPage = pageData.currentPage;
    const visibleResults = pageData.items;

    if (pagination) {
        if (pageData.totalItems > RESULTS_PAGE_SIZE) {
            const firstItem = pageData.startIndex + 1;
            const lastItem = pageData.startIndex + visibleResults.length;
            pagination.innerHTML = `<span class="results-pagination-summary" data-page-summary aria-live="polite">Mostrando ${firstItem}–${lastItem} de ${pageData.totalItems} proyectos</span><div class="results-pagination-controls"><button type="button" class="btn-secondary btn-sm" data-page-step="-1" aria-label="Página anterior" ${pageData.currentPage === 1 ? "disabled" : ""}>Anterior</button><span>Página ${pageData.currentPage} de ${pageData.totalPages}</span><button type="button" class="btn-secondary btn-sm" data-page-step="1" aria-label="Página siguiente" ${pageData.currentPage === pageData.totalPages ? "disabled" : ""}>Siguiente</button></div>`;
        } else {
            pagination.innerHTML = pageData.totalItems ? `<span class="results-pagination-summary" data-page-summary aria-live="polite">Mostrando ${pageData.totalItems} proyectos</span>` : "";
        }
        pagination.onclick = async (event) => {
            const button = event.target.closest("[data-page-step]");
            if (!button || button.disabled) return;
            resultsCurrentPage += Number(button.dataset.pageStep);
            await renderAdminReportsByFeria(latestAdminReportData);
            document.querySelector(".results-section-scores")?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start"
            });
        };
    }

    if (!visibleResults.length) {
        const message = results.length ? "No hay proyectos que coincidan con la búsqueda." : "No hay proyectos en la feria seleccionada.";
        tbody.innerHTML = `<tr role="row"><td role="cell" colspan="4">${message}</td></tr>`;
        return;
    }

    function buildProjectRow(r) {
        const totalVoted = r.expoVoted + r.escritoVoted;
        const totalAssigned = r.expoTotal + r.escritoTotal;
        const pct = totalAssigned > 0 ? Math.round(totalVoted / totalAssigned * 100) : 0;
        const barColor = pct === 100 ? "var(--secondary)" : pct > 50 ? "var(--secondary-light)" : "var(--ink-secondary)";
        const progressHtml = totalAssigned > 0 ?
            `<div class="judge-progress-wrap" role="progressbar" aria-label="Avance de jueces para ${escapeHTML(r.projectName)}" aria-valuemin="0" aria-valuemax="${totalAssigned}" aria-valuenow="${totalVoted}"><div class="judge-progress-bar" aria-hidden="true" style="width:${pct}%;background:${barColor}"></div></div><span class="judge-status">${getJudgeProgressLabel(totalVoted, totalAssigned)}</span>` :
            `<span class="judge-status">${getJudgeProgressLabel(totalVoted, totalAssigned)}</span>`;
        const escritoCell = r.writtenMax === 0 ?
            '<span class="judge-empty">No aplica</span>' : r.manualEscrito !== null ?
            `<span class="manual-score-display">${r.manualEscrito.toFixed(0)} <span class="judge-status">(manual)</span></span>
         <button class="btn-manual-escrito" data-project-id="${r.projectId}" data-current="${r.manualEscrito}" title="Editar puntaje manual" aria-label="Editar puntaje manual">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
         </button>` :
            `${formatJudgeColumn(r.escritoJudges, r.escritoVoted, r.escritoTotal)}
         <br><button class="btn-manual-escrito" data-project-id="${r.projectId}" data-current="" title="Ingresar puntaje escrito manual" aria-label="Ingresar puntaje escrito manual">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
           Ingresar manual
         </button>`;
        return `<tr role="row" data-result-row="${r.projectId}" data-written-max="${r.writtenMax}">
      <td role="cell" headers="scores-project">
        <strong>${escapeHTML(r.projectName)}</strong>
        ${progressHtml}
      </td>
      <td role="cell" headers="scores-expo">${formatJudgeColumn(r.expoJudges, r.expoVoted, r.expoTotal)}</td>
      <td role="cell" class="escrito-cell" headers="scores-written">${escritoCell}</td>
      <td role="cell" class="score-cell" headers="scores-final"><strong>${r.finalScore.toFixed(0)}</strong></td>
    </tr>`;
    }

    // Event delegation para guardar puntaje escrito manual
    tbody.onclick = function handleManualClick(e) {
        const btn = e.target.closest(".btn-manual-escrito");
        if (!btn) return;
        const projectId = btn.dataset.projectId;
        const current = btn.dataset.current;
        const cell = btn.closest(".escrito-cell");
        if (!cell || cell.querySelector(".manual-escrito-form")) return;

        const originalContent = cell.innerHTML;
        const hasCurrent = current !== "";
        const maxScore = Number(btn.closest("tr")?.dataset.writtenMax || 0);
        cell.innerHTML = `
      <form class="manual-escrito-form" style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;" aria-label="Puntaje escrito manual">
        <label class="sr-only" for="manual-score-${projectId}">Puntaje escrito (0 a ${maxScore})</label>
        <input id="manual-score-${projectId}" type="number" class="manual-escrito-input" min="0" max="${maxScore}" step="0.1"
          value="${escapeHTML(current)}" placeholder="0–${maxScore}" inputmode="decimal" required style="width:90px;">
        <span class="judge-status" aria-hidden="true">/ ${maxScore}</span>
        <button type="submit" class="btn-primary btn-sm">Guardar</button>
        ${hasCurrent ? '<button type="button" class="btn-secondary btn-sm manual-escrito-delete">Borrar</button>' : ''}
        <button type="button" class="btn-secondary btn-sm manual-escrito-cancel">Cancelar</button>
      </form>`;

        cell.querySelector(".manual-escrito-cancel").addEventListener("click", () => {
            cell.innerHTML = originalContent;
        });
        cell.querySelector(".manual-escrito-input")?.focus();

        async function saveScore(num) {
            const submitButton = cell.querySelector('button[type="submit"]');
            const deleteButton = cell.querySelector('.manual-escrito-delete');
            if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Guardando…"; }
            if (deleteButton) deleteButton.disabled = true;
            const { error } = await supabase.rpc("admin_set_manual_escrito", {
                p_session_token: getSession()?.session_token,
                p_project_id: Number(projectId),
                p_score: num
            });
            if (error) {
                showToast("Error al guardar: " + (error.message ?? "desconocido"), "error");
                cell.innerHTML = originalContent;
                return;
            }
            showToast(num === null ? "Puntaje manual eliminado." : "Puntaje manual guardado.", "success");
            await renderAdminReportsByFeria(await loadAdminReportData());
        }

        cell.querySelector(".manual-escrito-form").addEventListener("submit", async (ev) => {
            ev.preventDefault();
            const val = cell.querySelector(".manual-escrito-input").value.trim();
            const num = val === "" ? null : Number(val);
            if (val === "" || !Number.isFinite(num) || num < 0 || num > maxScore) {
                showToast(`Ingrese un puntaje entre 0 y ${maxScore}.`, "error");
                return;
            }
            await saveScore(num);
        });

        const deleteBtn = cell.querySelector(".manual-escrito-delete");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async () => {
                const confirmed = await confirmDialog({
                    title: "Borrar puntaje manual",
                    message: "Se volverá a usar el promedio de jueces para este proyecto.",
                    confirmLabel: "Borrar puntaje"
                });
                if (!confirmed) return;
                await saveScore(null);
            });
        }
    };

    const groupByCategory = results.some((result) =>
        result.feria === "Feria Expotecnica" ||
        result.feria === "Festival Estudiantil de las Artes" ||
        result.feria === "Feria Cientifica y Tecnologica"
    );

    if (groupByCategory) {
        const allGroups = new Map();
        results.forEach((r) => {
            const groupLabel = getResultCategoryGroupLabel(r.feria, r.categoria, r.nivel, selectedFeria, r.subcategoria);
            if (!allGroups.has(groupLabel)) allGroups.set(groupLabel, []);
            allGroups.get(groupLabel).push(r);
        });

        const visibleGroups = new Map();
        visibleResults.forEach((r) => {
            const groupLabel = getResultCategoryGroupLabel(r.feria, r.categoria, r.nivel, selectedFeria, r.subcategoria);
            if (!visibleGroups.has(groupLabel)) visibleGroups.set(groupLabel, []);
            visibleGroups.get(groupLabel).push(r);
        });

        const html = [];
        for (const [groupLabel, items] of visibleGroups) {
            const winner = (allGroups.get(groupLabel) ?? []).find((item) => item.evaluationComplete && item.finalScore > 0);
            const winnerText = winner ?
                `Ganador: ${escapeHTML(winner.projectName)} (${winner.finalScore.toFixed(0)} pts)` :
                "Ganador pendiente de evaluacion";
            const groupParts = groupLabel.split(" — ");
            const hasLevel = groupParts.length >= 3;
            const levelLabel = hasLevel ? groupParts.at(-1) : "";
            const titleLabel = hasLevel ? groupParts.at(-2) : groupParts.at(-1);
            const contextLabel = hasLevel ? groupParts.slice(0, -2).join(" · ") : groupParts.slice(0, -1).join(" · ");
            html.push(`<tr role="row" class="category-group-row"><td role="cell" colspan="4"><div class="category-group-heading">
                <div class="category-group-heading-copy">
                    ${contextLabel ? `<span class="category-group-context">${escapeHTML(contextLabel)}</span>` : ""}
                    <span class="category-group-title">${escapeHTML(titleLabel)}</span>
                </div>
                ${levelLabel ? `<span class="category-group-level">${escapeHTML(levelLabel)}</span>` : ""}
                <span class="category-winner">${winnerText}</span>
            </div></td></tr>`);
            items.forEach((r) => html.push(buildProjectRow(r)));
        }
        tbody.innerHTML = html.join("");
    } else {
        tbody.innerHTML = visibleResults.map(buildProjectRow).join("");
    }
}


async function loadAdminReportData({ includeUsers = true, includeProjects = true, includeEvaluations = true, includeAssignments = true } = {}) {
    const [users, projects, allEvals, assignments] = await Promise.all([
        includeUsers ? loadUsers() : Promise.resolve([]),
        includeProjects ? loadProjects("") : Promise.resolve([]),
        includeEvaluations ? fetchAllEvaluations() : Promise.resolve([]),
        includeAssignments ? loadJudgeAssignments() : Promise.resolve([])
    ]);

    return { users, projects, allEvals, assignments };
}

async function renderAdminReportsByFeria(reportData = latestAdminReportData) {
    const hasAnyReportTarget =
        document.querySelector("[data-admin-evaluations]") ||
        document.querySelector("[data-admin-projects]") ||
        document.querySelector("[data-project-results]");

    if (!hasAnyReportTarget) {
        return;
    }

    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";

    const data = reportData ?? await loadAdminReportData();
    latestAdminReportData = data;

    const { users, projects: allProjects, allEvals, assignments: assignmentsResult } = data;

    const filteredProjects = selectedFeria ?
        allProjects.filter((p) => p.tipo_feria === selectedFeria) :
        allProjects;

    const projectIdsInFeria = new Set(filteredProjects.map((p) => p.id));

    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
    const filteredRows = (allEvals ?? []).filter((r) =>
        projectIdsInFeria.has(r.proyecto_id)
    );

    const assignmentsByProject = new Map();
    (assignmentsResult ?? []).forEach((a) => {
        if (projectIdsInFeria.has(a.proyecto_id)) {
            if (!assignmentsByProject.has(a.proyecto_id)) {
                assignmentsByProject.set(a.proyecto_id, []);
            }
            assignmentsByProject.get(a.proyecto_id).push({
                juez_id: a.juez_id,
                tipo_evaluacion: a.tipo_evaluacion ?? "Exposición",
                judgeName: usersById ?.get(a.juez_id) ?.nombre ?? `Juez #${a.juez_id}`
            });
        }
    });

    renderAdminEvaluationsTable(filteredRows, usersById, projectsById);
    renderAdminProjectsTable(filteredProjects, filteredRows, selectedFeria);
    renderAdminScoresTable(filteredRows, projectsById, assignmentsByProject, selectedFeria);

    // Update summary cards
    const uniqueProjects = new Set(filteredProjects.map((project) => project.id));
    const uniqueJudges = new Set(
        assignmentsResult
            .filter((assignment) => projectIdsInFeria.has(assignment.proyecto_id))
            .map((assignment) => assignment.juez_id)
    );
    const totalEval = filteredRows.length;

    const totalProjEl = document.querySelector("[data-total-projects]");
    const totalJudEl = document.querySelector("[data-total-judges]");
    const totalEvalEl = document.querySelector("[data-total-evaluations]");
    if (totalProjEl) totalProjEl.textContent = uniqueProjects.size;
    if (totalJudEl) totalJudEl.textContent = uniqueJudges.size;
    if (totalEvalEl) totalEvalEl.textContent = totalEval;
}


function renderJudgeAssignmentsTable(judges, projects, assignments) {
    const tbody = document.querySelector("[data-judge-assignments]");

    if (!tbody) {
        return;
    }

    if (!judges.length) {
        tbody.innerHTML = '<tr role="row"><td role="cell" colspan="3">No hay jueces registrados.</td></tr>';
        return;
    }

    const projectsById = new Map(projects.map((p) => [p.id, p]));
    const assignmentsByJudge = new Map();

    assignments.forEach((assignment) => {
        const current = assignmentsByJudge.get(assignment.juez_id) ?? [];
        const project = projectsById.get(assignment.proyecto_id);
        current.push({
            id: assignment.proyecto_id,
            titulo: project ?.titulo ?? "Proyecto",
            contexto: getFestivalProjectLabel(project),
            tipo_evaluacion: assignment.tipo_evaluacion ?? "Exposición"
        });
        assignmentsByJudge.set(assignment.juez_id, current);
    });

    tbody.innerHTML = judges
        .map((judge) => {
            const judgeAssignments = assignmentsByJudge.get(judge.id) ?? [];

            const projectList = judgeAssignments.length ?
                judgeAssignments.map((a) =>
                    `${escapeHTML(a.titulo)}${a.contexto ? ` <span class="judge-status">(${escapeHTML(a.contexto)})</span>` : ""} <span class="tipo-badge tipo-badge--${a.tipo_evaluacion === "Escrito" ? "escrito" : "expo"}">${escapeHTML(a.tipo_evaluacion)}</span>`
                ).join("<br>") :
                '<span class="text-muted">Sin proyectos asignados</span>';

            const count = judgeAssignments.length;

            return `
        <tr role="row" data-judge-row data-judge-id="${judge.id}">
          <td role="cell" headers="assignment-judge"><strong>${escapeHTML(judge.nombre)}</strong></td>
          <td role="cell" class="assigned-projects-cell" headers="assignment-projects">${projectList}</td>
          <td role="cell" headers="assignment-actions">
            <button type="button" class="btn-secondary btn-sm" data-open-assign-modal data-judge-id="${judge.id}" data-judge-name="${escapeHTML(judge.nombre)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
              Asignar (${count}/${projects.length})
            </button>
          </td>
        </tr>
      `;
        })
        .join("");
}

function openAssignmentModal(judgeId, judgeName, allProjects, currentAssignments) {
    const overlay = document.querySelector("[data-assignment-modal]");
    const nameEl = document.querySelector("[data-modal-judge-name]");
    const listEl = document.querySelector("[data-modal-project-list]");
    const counterEl = document.querySelector("[data-modal-counter]");
    const saveBtn = document.querySelector("[data-modal-save]");
    const selectAllBtn = document.querySelector("[data-modal-select-all]");
    const emptyEl = document.querySelector("[data-modal-empty]");

    if (!overlay) return;

    const searchEl = document.querySelector("[data-modal-search]");
    const setButtonLabel = (button, selector, label) => {
        const labelEl = button?.querySelector(selector);
        if (labelEl) {
            labelEl.textContent = label;
        } else if (button) {
            button.textContent = label;
        }
    };
    nameEl.textContent = `Juez: ${judgeName}`;
    searchEl.value = "";
    setButtonLabel(selectAllBtn, "[data-select-all-label]", "Seleccionar todos");
    if (emptyEl) emptyEl.hidden = true;
    openModalAccesible(overlay, { initialFocus: searchEl });

    const assignedIds = new Set(currentAssignments.map((a) => a.id));
    const selectedTipoMap = new Map(currentAssignments.map((a) => [a.id, a.tipo_evaluacion]));

    let searchTerm = "";

    function normalize(str) {
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function renderList() {
        const rows = listEl.querySelectorAll("[data-project-row]");
        let visibleCount = 0;
        rows.forEach((row) => {
            const match = !searchTerm || normalize(row.querySelector(".modal-project-title").textContent).includes(searchTerm);
            row.style.display = match ? "" : "none";
            if (match) visibleCount++;
        });

        if (emptyEl) emptyEl.hidden = visibleCount > 0;

        const checkedCount = listEl.querySelectorAll("[data-project-checkbox]:checked").length;
        counterEl.textContent = `${checkedCount}/${allProjects.length} seleccionados`;

        if (selectAllBtn) {
            setButtonLabel(selectAllBtn, "[data-select-all-label]", checkedCount >= allProjects.length ? "Quitar todos" : "Seleccionar todos");
        }

        if (checkedCount >= allProjects.length) {
            listEl.querySelectorAll("[data-project-checkbox]:not(:checked)").forEach((cb) => {
                cb.disabled = true;
            });
        } else {
            listEl.querySelectorAll("[data-project-checkbox]").forEach((cb) => {
                cb.disabled = false;
            });
        }
    }

    listEl.innerHTML = allProjects.map((project) => {
                const checked = assignedIds.has(project.id) ? "checked" : "";
                const supportsDualEval = project.tipo_feria === "Feria Cientifica y Tecnologica" || project.tipo_feria === "Feria Expotecnica";
                const projectContext = getFestivalProjectLabel(project);
                const tipoVal = supportsDualEval ?
                    (selectedTipoMap.get(project.id) ?? "Exposición") :
                    "Exposición";

                return `
      <div class="modal-project-row" data-project-row data-project-id="${project.id}">
        <label class="modal-project-label">
          <input type="checkbox" data-project-checkbox value="${project.id}" ${checked}>
          <span class="modal-project-title">${escapeHTML(project.titulo)}${projectContext ? ` <span class="judge-status">(${escapeHTML(projectContext)})</span>` : ""}</span>
          <span class="modal-project-feria">${escapeHTML(project.tipo_feria ?? "")}</span>
        </label>
        <div class="modal-project-control">
          <span class="modal-project-control-label">Tipo de evaluación</span>
          <select data-tipo-select class="assignment-tipo-select" aria-label="Tipo de evaluación para ${escapeHTML(project.titulo)}"${!supportsDualEval ? " disabled" : ""}>
            <option value="Exposición">Exposición</option>
            ${supportsDualEval ? `<option value="Escrito" ${tipoVal === "Escrito" ? "selected" : ""}>Escrito</option>` : ""}
          </select>
        </div>
      </div>
    `;
  }).join("");

  renderList();

  searchEl.addEventListener("input", (e) => {
    searchTerm = e.target.value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    renderList();
  });

  listEl.addEventListener("change", (e) => {
    if (e.target.matches("[data-project-checkbox]")) {
      renderList();
    }
  });

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const checkedCount = listEl.querySelectorAll("[data-project-checkbox]:checked").length;
      const checkAll = checkedCount < allProjects.length;
      listEl.querySelectorAll("[data-project-checkbox]").forEach((cb) => {
        cb.checked = checkAll;
      });
      renderList();
    });
  }

  saveBtn.onclick = async () => {
    const checkedBoxes = [...listEl.querySelectorAll("[data-project-checkbox]:checked")];
    const assignments = checkedBoxes.map((cb) => {
      const projectId = Number(cb.value);
      const row = cb.closest("[data-project-row]");
      const tipo = row.querySelector("[data-tipo-select]").value;
      return { proyecto_id: projectId, tipo_evaluacion: tipo };
    });

    const selectedIds = assignments.map((a) => a.proyecto_id);
    if (selectedIds.length > 0 && new Set(selectedIds).size !== selectedIds.length) {
      showToast("Los proyectos seleccionados deben ser diferentes.", "error");
      return;
    }

    if (assignments.length > allProjects.length) {
      showToast("Maximo " + allProjects.length + " proyectos por juez.", "error");
      return;
    }

    saveBtn.disabled = true;
    setButtonLabel(saveBtn, "[data-save-label]", "Guardando...");

    try {
      const assignmentsPayload = assignments.map((a) => ({
        proyecto_id: a.proyecto_id,
        tipo_evaluacion: a.tipo_evaluacion
      }));

      const { error } = await supabase.rpc("admin_save_assignments", {
        p_session_token: getSession().session_token,
        p_juez_id: judgeId,
        p_assignments: assignmentsPayload
      });
      if (error) throw error;

      showToast("Asignacion guardada correctamente.", "success");
      closeAssignmentModal();

      const refreshEvent = new CustomEvent("assignments-changed");
      document.dispatchEvent(refreshEvent);
    } catch (e) {
      showToast("Error: " + (e.message ?? "desconocido"), "error");
      console.error("Save assignments error:", e);
    }

    saveBtn.disabled = false;
    setButtonLabel(saveBtn, "[data-save-label]", "Guardar asignaciones");
  };

  document.querySelector("[data-modal-cancel]").onclick = () => closeAssignmentModal();
  document.querySelector("[data-modal-close]").onclick = () => closeAssignmentModal();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAssignmentModal();
  });
}

function closeAssignmentModal() {
  const overlay = document.querySelector("[data-assignment-modal]");
  closeModalAccesible(overlay);
}

function clearProjectFieldError(field) {
  if (!field) return;
  const errorId = field.getAttribute("aria-describedby");
  if (errorId) document.getElementById(errorId)?.remove();
  field.removeAttribute("aria-invalid");
  field.removeAttribute("aria-describedby");
  field.closest(".field-label")?.querySelectorAll(".field-error").forEach((error) => error.remove());
}

function clearProjectFormErrors(form) {
  form.querySelectorAll("[aria-invalid='true']").forEach(clearProjectFieldError);
}

function markProjectFieldInvalid(form, fieldName, message) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (!field) return false;
  clearProjectFieldError(field);
  const error = document.createElement("span");
  error.className = "field-error";
  error.id = `project-field-error-${fieldName}`;
  error.setAttribute("role", "alert");
  error.textContent = message;
  field.closest(".field-label")?.append(error);
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", error.id);
  field.focus();
  return false;
}

export async function bootstrapAdminPage() {
  const mainContent = document.querySelector("#main-content");
  const scoresSection = mainContent?.querySelector(".results-section-scores");
  const evaluationsSection = mainContent?.querySelector(".results-section-evaluations");
  if (scoresSection && evaluationsSection) evaluationsSection.before(scoresSection);

  bindLogout();
  highlightActiveNavLink();
  setupHideOnScroll();
  setupHamburgerMenu();
  const user = await enforceRole("administrador");

  if (!user) {
    return;
  }

  const adminName = document.querySelector("[data-admin-name]");
  const feriaTag = document.querySelector("[data-feria-tag]");

  if (adminName) {
    adminName.textContent = user.nombre;
  }
  if (feriaTag) {
    feriaTag.textContent = user.role === "administrador" ? "Acceso global" : (user.tipo_feria ?? "");
  }

  const userForm = document.querySelector("[data-user-form]");
  const projectForm = document.querySelector("[data-project-form]");

  if (projectForm) {
    const feriaSelect = projectForm.querySelector('select[name="tipo_feria"]');

    if (feriaSelect) {
      feriaSelect.addEventListener("change", () => updateProjectFormFieldsByFeria(projectForm));
    }

    const categorySelect = projectForm.querySelector('select[name="categoria_festival"]');
    const expoCategorySelect = projectForm.querySelector('select[name="categoria_expotecnica"]');

    updateProjectFormFieldsByFeria(projectForm);

    categorySelect?.addEventListener("change", () => updateProjectFormFieldsByFeria(projectForm));
    expoCategorySelect?.addEventListener("change", () => updateProjectFormFieldsByFeria(projectForm));

    const nivelCientSelect = projectForm.querySelector('[data-nivel-cientifico-select]');
    nivelCientSelect?.addEventListener("change", () => updateProjectFormFieldsByFeria(projectForm));
    projectForm.addEventListener("input", (event) => clearProjectFieldError(event.target));
    projectForm.addEventListener("change", (event) => {
      clearProjectFieldError(event.target);
      if (event.target === feriaSelect) clearProjectFormErrors(projectForm);
    });
  }

  let allProjectsCache = [];
  let allAssignmentsCache = [];
  let rolesCache = [];
  const adminLoadStatus = document.querySelector("[data-admin-load-status]");
  const usersTbody = document.querySelector("[data-users-table]");
  const projectsTbody = document.querySelector("[data-projects-table]");
  const assignmentsTbody = document.querySelector("[data-judge-assignments]");
  const hasEvaluationView = Boolean(document.querySelector("[data-admin-evaluations], [data-admin-projects], [data-project-results]"));
  const needsUsers = Boolean(usersTbody || assignmentsTbody || hasEvaluationView);
  const needsProjects = Boolean(projectsTbody || assignmentsTbody || hasEvaluationView);
  const needsAssignments = Boolean(assignmentsTbody || hasEvaluationView);
  const needsRoles = Boolean(usersTbody || assignmentsTbody);

  function setAdminLoadState(state, message = "") {
    const main = document.querySelector("#main-content");
    if (main) main.setAttribute("aria-busy", String(state === "loading"));
    if (!adminLoadStatus) return;
    adminLoadStatus.replaceChildren();
    adminLoadStatus.dataset.kind = state === "error" ? "error" : "info";
    if (state === "loading") {
      adminLoadStatus.textContent = message || "Cargando datos…";
    } else if (state === "error") {
      adminLoadStatus.append(document.createTextNode(message || "No se pudieron cargar los datos."));
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "btn-secondary btn-sm";
      retryButton.dataset.adminRetryLoad = "";
      retryButton.textContent = "Reintentar";
      adminLoadStatus.append(" ", retryButton);
    } else {
      adminLoadStatus.removeAttribute("data-kind");
      adminLoadStatus.textContent = "";
    }
  }

  async function refreshAdminDataView() {
    if (usersTbody) showSkeleton(usersTbody, 4);
    if (assignmentsTbody) showSkeleton(assignmentsTbody, 3);
    setAdminLoadState("loading", "Cargando datos…");

    const [roles, reportData] = await Promise.all([
      needsRoles ? fetchAllRpc("get_roles", { p_session_token: getSession()?.session_token }) : Promise.resolve([]),
      loadAdminReportData({
        includeUsers: needsUsers,
        includeProjects: needsProjects,
        includeEvaluations: hasEvaluationView,
        includeAssignments: needsAssignments
      })
    ]);

    const { users = [], projects = [], assignments = [] } = reportData;
    const roleNamesById = new Map((roles ?? []).map((role) => [role.id, normalizeRoleName(role.nombre)]));
    const judges = users.filter((item) => roleNamesById.get(item.role_id) === "Juez");
    rolesCache = roles ?? [];
    latestAdminReportData = reportData;
    allProjectsCache = projects;
    allAssignmentsCache = assignments;

    if (usersTbody) {
      fillSelect(document.querySelector("[data-user-role-select]"), getAllowedRolesForUserForm(rolesCache), "Selecciona un rol");
      updateUserFeriaField(userForm, rolesCache);
      renderUsersTable(users, rolesCache);
    }
    if (projectsTbody) renderProjectsManagementTable(projects);
    if (assignmentsTbody) renderJudgeAssignmentsTable(judges, allProjectsCache, assignments);
    if (hasEvaluationView) await renderAdminReportsByFeria(reportData);
    setAdminLoadState("success");
  }

  adminLoadStatus?.addEventListener("click", (event) => {
    if (event.target.closest("[data-admin-retry-load]")) void refreshAdminDataView().catch(() => {
      setAdminLoadState("error", "No se pudieron cargar los datos. Revisa tu conexión e inténtalo de nuevo.");
    });
  });

  try {
    await refreshAdminDataView();
    if (hasEvaluationView) {
      startEvaluationsSync((rows) => {
        if (latestAdminReportData) {
          latestAdminReportData = {
            ...latestAdminReportData,
            allEvals: rows
          };
        }
        void renderAdminReportsByFeria(latestAdminReportData);
      });
    }
  } catch {
    setAdminLoadState("error", "No se pudieron cargar los datos. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (userForm) {
    const userRoleSelect = userForm.querySelector('[name="role_id"]');
    let userFormSubmitting = false;
    userRoleSelect?.addEventListener("change", () => updateUserFeriaField(userForm, rolesCache));

    userForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (userFormSubmitting) return;
      userFormSubmitting = true;
      const btn = userForm.querySelector("button[type=submit]");
      const originalText = btn.textContent;

      const formData = new FormData(userForm);
      const nombre = String(formData.get("nombre") ?? "").trim();
      const contrasena = String(formData.get("contrasena") ?? "");
      const roleId = Number(formData.get("role_id"));
      const isAdmin = isAdminRole(roleId, rolesCache);
      const tipoFeria = isAdmin ? null : String(formData.get("tipo_feria") ?? "").trim();

      if (!nombre || !contrasena || !roleId || (!isAdmin && !tipoFeria)) {
        showToast("Completa todos los campos del usuario.", "error");
        userFormSubmitting = false;
        return;
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const contrasenaHash = await hashPassword(contrasena);
        const { error } = await supabase.rpc("admin_insert_user", {
          p_session_token: user.session_token,
          p_nombre: nombre,
          p_role_id: roleId,
          p_contrasena_hash: contrasenaHash,
          p_tipo_feria: tipoFeria
        });

        if (error) {
          throw error;
        }

        userForm.reset();
        showToast("Usuario guardado correctamente.", "success");
        await refreshAdminDataView();
      } catch (err) {
        showToast(err?.message || "No se pudo guardar el usuario.", "error");
      }

      btn.disabled = false;
      btn.textContent = originalText;
      userFormSubmitting = false;
    });
  }

  if (projectForm) {
    projectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearProjectFormErrors(projectForm);
      const btn = projectForm.querySelector("button[type=submit]");
      const originalText = btn.textContent;
      const formData = new FormData(projectForm);
      const titulo = String(formData.get("titulo") ?? "").trim();
      const descripcion = String(formData.get("descripcion") ?? "").trim();
      const tipoFeria = String(formData.get("tipo_feria") ?? "").trim();
      const integrante1 = String(formData.get("integrante_1") ?? "").trim();
      const integrante2 = String(formData.get("integrante_2") ?? "").trim();
      const integrante3 = String(formData.get("integrante_3") ?? "").trim();
      const categoriaFestival = String(formData.get("categoria_festival") ?? "").trim();
      const subcategoriaFestival = String(formData.get("subcategoria_festival") ?? "").trim();
      const nivelFestival = String(formData.get("nivel_festival") ?? "").trim();
      const participacion = String(formData.get("participacion") ?? "").trim();
      const categoriaExpotecnica = String(formData.get("categoria_expotecnica") ?? "").trim();
      const ejeTematico = String(formData.get("eje_tematico") ?? "").trim();
      const categoriaPronatecyt = String(formData.get("categoria_pronatecyt") ?? "").trim();
      const nivelEducativo = String(formData.get("nivel_cientifico") ?? "").trim();
      const fechaEvaluacion = String(formData.get("fecha_evaluacion") ?? "").trim();
      const isFestival = tipoFeria === FESTIVAL_FERIA_NAME;
      const isExpotecnica = tipoFeria === "Feria Expotecnica";
      const isScientific = tipoFeria === "Feria Cientifica y Tecnologica";

      if (!titulo) return markProjectFieldInvalid(projectForm, "titulo", "Escribe el título del proyecto.");
      if (!tipoFeria) return markProjectFieldInvalid(projectForm, "tipo_feria", "Selecciona el tipo de feria.");

      if (!isFestival) {
        const memberFields = ["integrante_1", "integrante_2", "integrante_3"];
        const members = [integrante1, integrante2, integrante3];
        const missingIndex = members.findIndex((member) => !member);
        if (missingIndex >= 0) return markProjectFieldInvalid(projectForm, memberFields[missingIndex], "Completa los tres nombres de integrantes.");
        const seenMembers = new Set();
        for (let index = 0; index < members.length; index++) {
          const normalizedName = normalizeSearchText(members[index]);
          if (seenMembers.has(normalizedName)) return markProjectFieldInvalid(projectForm, memberFields[index], "Los nombres de integrantes deben ser diferentes.");
          seenMembers.add(normalizedName);
        }
      }

      if (isFestival) {
        if (!FESTIVAL_CATEGORIES.includes(categoriaFestival)) return markProjectFieldInvalid(projectForm, "categoria_festival", "Selecciona una categoría del Festival.");
        if (!(FESTIVAL_SUBCATEGORIES[categoriaFestival] ?? []).includes(subcategoriaFestival)) return markProjectFieldInvalid(projectForm, "subcategoria_festival", "Selecciona una subcategoría válida.");
        if (!FESTIVAL_EDUCATIONAL_LEVELS.includes(nivelFestival)) return markProjectFieldInvalid(projectForm, "nivel_festival", "Selecciona el nivel educativo.");
        if (!participacion) return markProjectFieldInvalid(projectForm, "participacion", "Selecciona el tipo de participación.");
      } else if (isExpotecnica) {
        if (!EXPOTECNICA_CATEGORIES.includes(categoriaExpotecnica)) return markProjectFieldInvalid(projectForm, "categoria_expotecnica", "Selecciona una categoría de ExpoTécnica.");
        if (!EXPOTECNICA_EJES.includes(ejeTematico)) return markProjectFieldInvalid(projectForm, "eje_tematico", "Selecciona un eje temático.");
      } else if (isScientific) {
        if (!PRONAFECYT_EDUCATIONAL_CATEGORIES.includes(nivelEducativo)) return markProjectFieldInvalid(projectForm, "nivel_cientifico", "Selecciona la categoría educativa.");
        if (!PRONAFECYT_CATEGORIES.includes(categoriaPronatecyt)) return markProjectFieldInvalid(projectForm, "categoria_pronatecyt", "Selecciona el formulario PRONAFECYT.");
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const payload = {
          titulo,
          descripcion: descripcion || null,
          tipo_feria: tipoFeria,
          nivel_educativo: isFestival ? nivelFestival : isScientific ? nivelEducativo || null : null,
          integrante_1: isFestival ? null : integrante1 || null,
          integrante_2: isFestival ? null : integrante2 || null,
          integrante_3: isFestival ? null : integrante3 || null,
          categoria_festival: isFestival ? categoriaFestival : null,
          subcategoria_festival: isFestival ? subcategoriaFestival : null,
          participacion: participacion || null,
          categoria_expotecnica: isExpotecnica ? categoriaExpotecnica : null,
          eje_tematico: isExpotecnica ? ejeTematico : null,
          categoria_pronatecyt: isScientific ? categoriaPronatecyt : null,
          fecha_evaluacion: fechaEvaluacion || null
        };

        const { error } = await supabase.rpc("admin_save_project", {
          p_session_token: user.session_token,
          p_data: payload
        });

        if (error) throw error;

        projectForm.reset();
        const resetFeriaInput = projectForm.querySelector('input[name="tipo_feria"]');
        if (resetFeriaInput && user.tipo_feria) resetFeriaInput.value = user.tipo_feria;
        showToast("Proyecto guardado correctamente.", "success");
        await refreshAdminDataView();
      } catch (err) {
        showToast(err?.message || "No se pudo guardar el proyecto.", "error");
      }

      btn.disabled = false;
      btn.textContent = originalText;
    });
  }

  const assignmentsTable = document.querySelector("[data-judge-assignments]");

  if (assignmentsTable) {
    assignmentsTable.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-open-assign-modal]");
      if (!btn) return;

      const judgeId = Number(btn.dataset.judgeId);
      const judgeName = btn.dataset.judgeName;

      const existing = [];

      allAssignmentsCache.forEach((a) => {
        if (Number(a.juez_id) === judgeId) {
          existing.push({ id: a.proyecto_id, tipo_evaluacion: a.tipo_evaluacion ?? "Exposición" });
        }
      });

      openAssignmentModal(judgeId, judgeName, allProjectsCache, existing);
    });

    document.addEventListener("assignments-changed", () => {
      refreshAdminDataView();
    });
  }

  if (usersTbody) {
    usersTbody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest(".edit-user-btn");
      const deleteBtn = event.target.closest(".delete-user-btn");

      if (editBtn) {
        try {
          const userData = JSON.parse(editBtn.dataset.editUser);
          const roles = await fetchAllRpc("get_roles", { p_session_token: getSession()?.session_token });
          showEditUserModal(userData, roles);
        } catch {
          showEditUserModal({ id: 0, nombre: "", role_id: 0, tipo_feria: "" }, []);
        }
      }

      if (deleteBtn) {
        const userId = Number(deleteBtn.dataset.deleteUserId);
        const ok = await confirmDialog({
          title: "Eliminar usuario",
          message: "Esta acción no se puede deshacer."
        });
        if (ok) {
          await deleteUser(userId);
          clearSessionCache(CACHE_SCOPE.ALL);
          await refreshAdminDataView();
        }
      }
    });
  }

  if (projectsTbody) {
    projectsTbody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest(".edit-project-btn");
      const deleteBtn = event.target.closest(".delete-project-btn");

      if (editBtn) {
        const projectId = Number(editBtn.dataset.projectId);
        const { data, error } = await supabase.rpc("get_project", { p_session_token: getSession()?.session_token, p_project_id: projectId });
        const projectData = Array.isArray(data) ? data[0] : data;
        if (error || !projectData) {
          showToast("Error al leer datos del proyecto.", "error");
          return;
        }
        showEditProjectModal(projectData);
        return;
      }

      if (!deleteBtn) {
        return;
      }

      const projectId = Number(deleteBtn.dataset.deleteProjectId);

      if (!projectId) {
        return;
      }

      const ok = await confirmDialog({
        title: "Eliminar proyecto",
        message: "También se eliminarán sus asignaciones y evaluaciones. Esta acción no se puede deshacer."
      });

      if (!ok) {
        return;
      }

      try {
        const { error } = await supabase.rpc("admin_delete_project", {
          p_session_token: getSession()?.session_token,
          p_project_id: projectId
        });

        if (error) {
          throw error;
        }

        showToast("Proyecto eliminado correctamente.", "success");
        clearSessionCache(CACHE_SCOPE.EVALUATIONS);
        await refreshAdminDataView();
      } catch (err) {
        showToast(err?.message || "No se pudo eliminar el proyecto.", "error");
      }
    });
  }

  const feriaResultsFilter = document.querySelector("[data-feria-results-filter]");
  if (feriaResultsFilter) {
    feriaResultsFilter.addEventListener("change", () => {
      resultsCurrentPage = 1;
      void renderAdminReportsByFeria(latestAdminReportData);
    });
  }

  const resultsSearch = document.querySelector("[data-results-search]");
  resultsSearch?.addEventListener("input", () => {
    resultsSearchTerm = normalizeSearchText(resultsSearch.value);
    resultsCurrentPage = 1;
    void renderAdminReportsByFeria(latestAdminReportData);
  });

  const exportBtn = document.getElementById("export-pdf-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => generateAdminPDF(getSession()?.session_token));
  }

  if (document.querySelector("[data-observaciones-groups]")) {
    const feriaFilter = document.querySelector("[data-observaciones-feria-filter]");
    const proyectoFilter = document.querySelector("[data-observaciones-proyecto-filter]");
    const juezFilter = document.querySelector("[data-observaciones-juez-filter]");
    const proyectoSearch = document.querySelector("[data-observaciones-proyecto-search]");
    const juezSearch = document.querySelector("[data-observaciones-juez-search]");
    const clearFilters = document.querySelector("[data-observaciones-clear]");
    let observationsCache = null;
    let observationsVisibleLimit = 20;

    async function refreshObservaciones() {
      await renderAdminObservaciones(
        feriaFilter?.value ?? "",
        proyectoFilter,
        juezFilter,
        proyectoSearch?.value ?? "",
        juezSearch?.value ?? "",
        observationsCache,
        (data) => { observationsCache = data; },
        observationsVisibleLimit,
        () => {
          observationsVisibleLimit += 20;
          refreshObservaciones();
        }
      );
    }

    function resetAndRefreshObservaciones() {
      observationsVisibleLimit = 20;
      refreshObservaciones();
    }

    await refreshObservaciones();

    feriaFilter?.addEventListener("change", resetAndRefreshObservaciones);
    proyectoFilter?.addEventListener("change", resetAndRefreshObservaciones);
    juezFilter?.addEventListener("change", resetAndRefreshObservaciones);
    proyectoSearch?.addEventListener("input", resetAndRefreshObservaciones);
    juezSearch?.addEventListener("input", resetAndRefreshObservaciones);
    clearFilters?.addEventListener("click", () => {
      if (feriaFilter) feriaFilter.value = "";
      if (proyectoFilter) proyectoFilter.value = "";
      if (juezFilter) juezFilter.value = "";
      if (proyectoSearch) proyectoSearch.value = "";
      if (juezSearch) juezSearch.value = "";
      resetAndRefreshObservaciones();
    });
  }

  document.addEventListener("users-changed", () => refreshAdminDataView());
  document.addEventListener("projects-changed", () => refreshAdminDataView());

}


async function renderAdminObservaciones(feriaType = "", proyectoFilter, juezFilter, proyectoSearchText = "", juezSearchText = "", cachedData = null, setCache = null, visibleLimit = 20, onLoadMore = null) {
  const container = document.querySelector("[data-observaciones-groups]");
  const status = document.querySelector("[data-observaciones-status]");
  const countBadge = document.querySelector("[data-observaciones-count]");
  if (!container) return;

  // skeleton
  container.innerHTML = Array.from({ length: 3 }, () => `
    <div class="skeleton-group">
      <div class="skeleton-group-bar"></div>
      ${Array.from({ length: 2 }, () => `
        <div class="skeleton-item">
          <div class="skeleton-item-meta">
            <div class="skeleton-meta-badge"></div>
            <div class="skeleton-meta-badge"></div>
            <div class="skeleton-meta-date"></div>
          </div>
          <div class="skeleton-text-line"></div>
          <div class="skeleton-text-line"></div>
        </div>
      `).join("")}
    </div>
  `).join("");
  if (countBadge) countBadge.hidden = true;

  let usersResult;
  let projectsResult;
  let observacionesResult;
  if (cachedData) {
    [usersResult, projectsResult, observacionesResult] = cachedData;
  } else {
    try {
      [usersResult, projectsResult, observacionesResult] = await Promise.all([
        loadUsers(),
        fetchAllRpc("get_projects", { p_session_token: getSession()?.session_token }),
        fetchAllRpc("get_observations", { p_session_token: getSession()?.session_token })
      ]);
      setCache?.([usersResult, projectsResult, observacionesResult]);
    } catch (error) {
      console.error("Error loading observations:", error);
      container.innerHTML = '<p class="form-status form-status--error">No se pudieron cargar las observaciones.</p>';
      setMessage(status, "Error al cargar observaciones.", "error");
      return;
    }
  }

  const allProjects = projectsResult.filter((p) => !feriaType || p.tipo_feria === feriaType);
  const allUsers = usersResult ?? [];
  const usersById = new Map(allUsers.map((u) => [u.id, u]));
  const projectsById = new Map(allProjects.map((p) => [p.id, p]));
  const projectIdsInFeria = new Set(allProjects.map((p) => p.id));
  const rows = observacionesResult.filter((r) => projectIdsInFeria.has(r.proyecto_id));

  const selectedProjectId = proyectoFilter ? Number(proyectoFilter.value) : 0;
  const selectedJudgeId = juezFilter ? Number(juezFilter.value) : 0;
  const normalizedProjectSearch = proyectoSearchText.trim().toLowerCase();
  const normalizedJudgeSearch = juezSearchText.trim().toLowerCase();

  const filtered = rows.filter((r) => {
    if (selectedProjectId && Number(r.proyecto_id) !== selectedProjectId) return false;
    if (selectedJudgeId && Number(r.juez_id) !== selectedJudgeId) return false;
    const projectTitle = String(projectsById.get(r.proyecto_id)?.titulo ?? "").toLowerCase();
    const judgeName = String(usersById.get(r.juez_id)?.nombre ?? "").toLowerCase();
    if (normalizedProjectSearch && !projectTitle.includes(normalizedProjectSearch)) return false;
    if (normalizedJudgeSearch && !judgeName.includes(normalizedJudgeSearch)) return false;
    return true;
  });

  const activeFilters = document.querySelector("[data-observaciones-active-filters]");
  if (activeFilters) {
    const labels = [];
    if (feriaType) labels.push(`Feria: ${feriaType}`);
    if (selectedProjectId) labels.push(`Proyecto: ${proyectoFilter?.selectedOptions[0]?.textContent ?? "seleccionado"}`);
    if (selectedJudgeId) labels.push(`Juez: ${juezFilter?.selectedOptions[0]?.textContent ?? "seleccionado"}`);
    if (normalizedProjectSearch) labels.push(`Proyecto: ${proyectoSearchText.trim()}`);
    if (normalizedJudgeSearch) labels.push(`Juez: ${juezSearchText.trim()}`);
    activeFilters.innerHTML = labels.map((label) => `<span class="observaciones-filter-chip">${escapeHTML(label)}</span>`).join("");
  }

  // populate filter selects
  const projectOpts = allProjects.sort((a, b) => a.titulo.localeCompare(b.titulo));
  if (proyectoFilter) {
    const curVal = proyectoFilter.value;
    proyectoFilter.innerHTML = '<option value="">Todos los proyectos</option>'
      + projectOpts.map((p) => {
        const context = getFestivalProjectLabel(p);
        const label = context ? `${p.titulo} (${context})` : p.titulo;
        return `<option value="${p.id}">${escapeHTML(label)}</option>`;
      }).join("");
    if (curVal && [...proyectoFilter.options].some((o) => o.value === curVal)) proyectoFilter.value = curVal;
  }

  const judges = allUsers.filter((u) => rows.some((r) => r.juez_id === u.id));
  if (juezFilter) {
    const curVal = juezFilter.value;
    juezFilter.innerHTML = '<option value="">Todos los jueces</option>'
      + judges.map((j) => `<option value="${j.id}">${escapeHTML(j.nombre)}</option>`).join("");
    if (curVal && [...juezFilter.options].some((o) => o.value === curVal)) juezFilter.value = curVal;
  }

  if (!filtered.length) {
    const hasFilters = feriaType || selectedProjectId || selectedJudgeId || normalizedProjectSearch || normalizedJudgeSearch;
    const emptyMessage = hasFilters ?
      "Ninguna observación coincide con los filtros seleccionados." :
      "Aún no hay observaciones registradas. Las observaciones aparecerán aquí a medida que los jueces evalúen proyectos.";
    container.innerHTML = `<div class="observaciones-empty-state"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg><p class="form-status">${emptyMessage}</p></div>`;
    setMessage(status, "", "info");
    if (countBadge) { countBadge.textContent = "0"; countBadge.hidden = false; }
    return;
  }

  const visibleRows = filtered.slice(0, visibleLimit);

  // group by proyecto
  const grouped = new Map();
  visibleRows.forEach((row) => {
    const pid = row.proyecto_id;
    if (!grouped.has(pid)) {
      const project = projectsById.get(pid);
      const context = getFestivalProjectLabel(project);
      grouped.set(pid, {
        title: project?.titulo ?? "Proyecto",
        context,
        rows: []
      });
    }
    grouped.get(pid).rows.push(row);
  });

  container.innerHTML = "";
  for (const [, data] of grouped) {
    const block = document.createElement("div");
    block.className = "observacion-group";

    const heading = document.createElement("button");
    heading.type = "button";
    heading.className = "observacion-group-heading";
    heading.setAttribute("aria-expanded", "true");
    heading.innerHTML = `<span>${escapeHTML(data.title)}${data.context ? ` <span class="judge-status">(${escapeHTML(data.context)})</span>` : ""}</span><span class="observacion-group-count">${data.rows.length}</span><span class="observacion-group-chevron" aria-hidden="true">⌄</span>`;

    const body = document.createElement("div");
    body.className = "observacion-group-body";
    heading.addEventListener("click", () => {
      const expanded = heading.getAttribute("aria-expanded") === "true";
      heading.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
    block.appendChild(heading);

    data.rows.forEach((row) => {
      const judge = usersById.get(row.juez_id);
      const judgeName = judge?.nombre ?? `Juez #${row.juez_id}`;
      const tipo = row.tipo_evaluacion ?? "Exposición";
      const fecha = row.created_at ? new Date(row.created_at).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "";

      const item = document.createElement("div");
      item.className = "observacion-item";

      const meta = document.createElement("div");
      meta.className = "observacion-item-meta";
      meta.innerHTML = `
        <span class="role-badge role-judge">${escapeHTML(judgeName)}</span>
        <span class="tipo-badge tipo-badge--${tipo === "Escrito" ? "escrito" : "expo"}">${escapeHTML(tipo)}</span>
        <span class="observacion-item-date">${escapeHTML(fecha)}</span>
      `;

      const texto = document.createElement("p");
      texto.className = "observacion-item-texto";
      texto.textContent = row.texto;

      item.appendChild(meta);
      item.appendChild(texto);
      body.appendChild(item);
    });

    block.appendChild(body);
    container.appendChild(block);
  }

  if (filtered.length > visibleLimit && onLoadMore) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "btn-secondary observaciones-load-more";
    loadMore.textContent = `Mostrar más (${filtered.length - visibleLimit} restantes)`;
    loadMore.addEventListener("click", onLoadMore, { once: true });
    container.appendChild(loadMore);
  }

  if (countBadge) { countBadge.textContent = `${filtered.length} obs.`; countBadge.hidden = false; }
  setMessage(status, `${filtered.length} observacion${filtered.length !== 1 ? "es" : ""} en ${grouped.size} proyecto${grouped.size !== 1 ? "s" : ""}.`, "success");
}

function showEditUserModal(user, roles) {
  const existing = document.getElementById("edit-user-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "edit-user-modal";
  overlay.className = "modal-overlay";

  const seenRoles = new Set();
  const uniqueRoles = roles.filter((r) => {
    const key = normalizeRoleName(r.nombre).toLowerCase();
    if (seenRoles.has(key)) return false;
    seenRoles.add(key);
    return true;
  });

  const roleOptions = uniqueRoles
    .map((r) => `<option value="${escapeHTML(String(r.id))}" ${Number(r.id) === Number(user.role_id) ? "selected" : ""}>${escapeHTML(normalizeRoleName(r.nombre))}</option>`)
    .join("");

  const feriaOptions = buildFeriaOptions(user.tipo_feria);

  const modal = document.createElement("div");
  modal.className = "modal-dialog edit-modal-box";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "edit-user-modal-title");

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-heading">
        <span class="modal-heading-icon" aria-hidden="true">${icon("pencil", 20)}</span>
        <div>
          <span class="modal-kicker">Cuenta de usuario</span>
          <h2 id="edit-user-modal-title">Editar usuario</h2>
        </div>
      </div>
      <button type="button" class="modal-close-btn" id="edit-user-close" aria-label="Cerrar ventana">${icon("x", 18)}</button>
    </div>
    <form id="edit-user-form" class="edit-modal-form">
      <p class="modal-form-lead">Actualiza los datos de acceso y el rol de esta cuenta.</p>
      <input type="hidden" name="user_id" value="${escapeHTML(String(user.id))}">
      <label class="edit-modal-field">
        Nombre
        <input name="nombre" type="text" required value="${escapeHTML(user.nombre)}">
      </label>
      <label class="edit-modal-field">
        Nueva contraseña <span style="color:#94a3b8;font-size:0.75rem;">(dejar en blanco para mantener)</span>
        <input name="contrasena" type="password" autocomplete="new-password">
      </label>
      <label class="edit-modal-field" data-user-feria-field>
        Tipo de feria
        <select name="tipo_feria">${feriaOptions}</select>
      </label>
      <label class="edit-modal-field">
        Rol
        <select name="role_id" required>${roleOptions}</select>
      </label>
      <div class="edit-modal-actions">
        <button type="submit" class="btn-primary">${icon("floppy-disk", 16)}<span>Guardar cambios</span></button>
        <button type="button" id="edit-user-cancel" class="btn-secondary">${icon("x", 16)}<span>Cancelar</span></button>
      </div>
      <p id="edit-user-status" class="edit-modal-status" role="status" aria-live="polite"></p>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  openModalAccesible(overlay);

  const editForm = document.getElementById("edit-user-form");
  const editRoleSelect = editForm.querySelector('[name="role_id"]');
  editRoleSelect.addEventListener("change", () => updateUserFeriaField(editForm, roles));
  updateUserFeriaField(editForm, roles);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModalAccesible(overlay);
      overlay.remove();
    }
  });

  document.getElementById("edit-user-cancel").addEventListener("click", () => {
    closeModalAccesible(overlay);
    overlay.remove();
  });
  document.getElementById("edit-user-close").addEventListener("click", () => {
    closeModalAccesible(overlay);
    overlay.remove();
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("edit-user-status");
    const btn = e.target.querySelector("button[type=submit]");
    const originalText = btn.textContent;
    const formData = new FormData(e.target);
    const userId = Number(formData.get("user_id"));
    const nombre = String(formData.get("nombre") ?? "").trim();
    const contrasena = String(formData.get("contrasena") ?? "");
    const roleId = Number(formData.get("role_id"));
    const isAdmin = isAdminRole(roleId, roles);
    const tipoFeria = isAdmin ? null : String(formData.get("tipo_feria") ?? "").trim();

    if (!nombre || !roleId || (!isAdmin && !tipoFeria)) {
      status.textContent = "Completa todos los campos.";
      status.style.color = "#dc2626";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Guardando...";
    status.textContent = "";
    status.style.color = "#64748b";

    try {
      await updateUser(userId, nombre, contrasena, tipoFeria, roleId);
      status.textContent = "Usuario actualizado correctamente.";
      status.style.color = "#16a34a";
      setTimeout(() => {
        closeModalAccesible(overlay);
        overlay.remove();
        document.dispatchEvent(new CustomEvent("users-changed"));
      }, 800);
    } catch (err) {
      const msg = err?.message || err || "Error desconocido";
      status.textContent = msg;
      status.style.color = "#dc2626";
      console.error("updateUser error:", err);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

async function updateUser(userId, nombre, contrasena, tipoFeria, roleId) {
  const contrasenaHash = contrasena ? await hashPassword(contrasena) : null;

  const { error } = await supabase.rpc("admin_update_user", {
    p_session_token: getSession()?.session_token,
    p_user_id: userId,
    p_nombre: nombre,
    p_role_id: roleId,
    p_tipo_feria: tipoFeria,
    p_contrasena_hash: contrasenaHash
  });
  if (error) throw error;
}

function showEditProjectModal(project) {
  const educationalCategoryOptions = [...new Set([
    ...PRONAFECYT_EDUCATIONAL_CATEGORIES,
    project.nivel_educativo
  ].filter(Boolean))];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-dialog edit-project-modal" role="dialog" aria-modal="true" aria-labelledby="edit-project-modal-title">
      <div class="modal-header">
        <div class="modal-heading">
          <span class="modal-heading-icon" aria-hidden="true">${icon("folder", 20)}</span>
          <div>
            <span class="modal-kicker">Información del proyecto</span>
            <h2 id="edit-project-modal-title">Editar proyecto</h2>
          </div>
        </div>
        <button type="button" class="modal-close-btn" data-close-modal aria-label="Cerrar ventana">${icon("x", 18)}</button>
      </div>
      <form data-edit-project-form>
        <p class="modal-form-lead">Corrige la información del proyecto sin perder sus asignaciones.</p>
        <input type="hidden" name="project_id" value="${escapeHTML(String(project.id))}">
        <input type="hidden" name="tipo_feria" value="${escapeHTML(String(project.tipo_feria ?? ""))}">

        <div class="field-group">
          <label class="field-label">
            <span>Titulo del proyecto</span>
            <input name="titulo" type="text" required value="${escapeHTML(String(project.titulo ?? ""))}">
          </label>
        </div>

        <div class="field-group">
          <label class="field-label">
            <span>Descripcion</span>
            <textarea name="descripcion" rows="3">${escapeHTML(String(project.descripcion ?? ""))}</textarea>
          </label>
        </div>

        <div class="field-group">
          <label class="field-label">
          <span>Fecha de evaluación</span>
            <input name="fecha_evaluacion" type="date" value="${escapeHTML(String(project.fecha_evaluacion ?? ""))}">
          </label>
        </div>

        <div data-integrantes-block>
          <div class="field-row">
            <label class="field-label">
              <span>Integrante 1</span>
              <input name="integrante_1" type="text" value="${escapeHTML(String(project.integrante_1 ?? ""))}">
            </label>
            <label class="field-label">
              <span>Integrante 2</span>
              <input name="integrante_2" type="text" value="${escapeHTML(String(project.integrante_2 ?? ""))}">
            </label>
            <label class="field-label">
              <span>Integrante 3</span>
              <input name="integrante_3" type="text" value="${escapeHTML(String(project.integrante_3 ?? ""))}">
            </label>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">
            <span>Participacion</span>
            <select name="participacion">
              <option value="">Selecciona la participacion</option>
              <option value="Individual" ${String(project.participacion ?? "") === "Individual" ? "selected" : ""}>Individual</option>
              <option value="Grupal" ${String(project.participacion ?? "") === "Grupal" ? "selected" : ""}>Grupal</option>
            </select>
          </label>
        </div>

        <div data-feria-section="Festival Estudiantil de las Artes">
          <div class="field-group">
            <label class="field-label">
              <span>Categoria del Festival</span>
              <select name="categoria_festival">
                <option value="">Selecciona una categoria</option>
                <option value="Artes Visuales">Artes Visuales</option>
                <option value="Artes Literarias">Artes Literarias</option>
                <option value="Artes Digitales">Artes Digitales</option>
                <option value="Artes Musicales">Artes Musicales</option>
                <option value="Artes Escenicas">Artes Escenicas</option>
              </select>
            </label>
            <label class="field-label" data-festival-subcategory-wrap hidden>
              <span>Subcategoria del Festival</span>
              <select name="subcategoria_festival">
                <option value="">Selecciona una subcategoria</option>
              </select>
            </label>
            <label class="field-label">
              <span>Nivel educativo</span>
              <select name="nivel_festival" data-festival-level-select>
                <option value="">Selecciona un nivel</option>
                ${FESTIVAL_EDUCATIONAL_LEVELS.map((level) => `<option value="${escapeHTML(level)}">${escapeHTML(level)}</option>`).join("")}
              </select>
            </label>
          </div>
        </div>

        <div data-feria-section="Feria Cientifica y Tecnologica">
          <div class="field-group">
            <label class="field-label">
               <span>Categoria educativa</span>
               <select name="nivel_cientifico" data-nivel-cientifico-select>
                 <option value="">Selecciona una categoria</option>
                 ${educationalCategoryOptions.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("")}
               </select>
            </label>
            <label class="field-label" data-pronafecyt-cat-wrap hidden>
              <span>Formulario PRONAFECYT</span>
              <select name="categoria_pronatecyt" data-pronatecyt-select>
                <option value="">Selecciona un formulario</option>
              </select>
            </label>
          </div>
        </div>

        <div data-feria-section="Feria Expotecnica">
          <div class="field-group">
            <label class="field-label">
              <span>Categoria de ExpoTECNICA</span>
              <select name="categoria_expotecnica">
                <option value="">Selecciona una categoria</option>
                <option value="DESAFIO STEAM">DESAFIO STEAM</option>
                <option value="EMPRENDIMIENTO E INNOVACION">EMPRENDIMIENTO E INNOVACION</option>
              </select>
            </label>
            <label class="field-label" data-expotecnica-eje-wrap hidden>
              <span>Eje tematico</span>
              <select name="eje_tematico">
                <option value="">Selecciona un eje tematico</option>
                <option value="PRODUCCION AGRICOLA Y PECUARIA">PRODUCCION AGRICOLA Y PECUARIA</option>
                <option value="INDUSTRIA ALIMENTARIA">INDUSTRIA ALIMENTARIA</option>
                <option value="ENERGIAS RENOVABLES">ENERGIAS RENOVABLES</option>
                <option value="INGENIERIA AMBIENTAL">INGENIERIA AMBIENTAL</option>
                <option value="MECATRONICA">MECATRONICA</option>
                <option value="TECNOLOGIAS DE LA INFORMACION APLICADAS A LA INFORMATICA">TECNOLOGIAS DE LA INFORMACION APLICADAS A LA INFORMATICA</option>
                <option value="INGENIERIA MECANICA">INGENIERIA MECANICA</option>
                <option value="INGENIERIA DE MATERIALES">INGENIERIA DE MATERIALES</option>
                <option value="INDUSTRIA CREATIVA">INDUSTRIA CREATIVA</option>
                <option value="CONTABILIDAD, FINANZAS Y BANCA">CONTABILIDAD, FINANZAS Y BANCA</option>
                <option value="SERVICIOS SECRETARIALES">SERVICIOS SECRETARIALES</option>
                <option value="HOSTELERIA Y SERVICIOS TURISTICOS">HOSTELERIA Y SERVICIOS TURISTICOS</option>
                <option value="GESTION DE SUMINISTROS">GESTION DE SUMINISTROS</option>
                <option value="MERCADEO">MERCADEO</option>
                <option value="SEGURIDAD Y PROTECCION LABORAL">SEGURIDAD Y PROTECCION LABORAL</option>
              </select>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" data-cancel-edit>${icon("x", 16)}<span>Cancelar</span></button>
          <button type="submit" class="btn-primary">${icon("floppy-disk", 16)}<span>Guardar cambios</span></button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  openModalAccesible(overlay);

  const form = overlay.querySelector("[data-edit-project-form]");
  const selectedFeria = String(project.tipo_feria ?? "");

  const sections = form.querySelectorAll("[data-feria-section]");
  sections.forEach((section) => {
    const sectionFeria = String(section.dataset.feriaSection ?? "");
    section.hidden = sectionFeria !== selectedFeria;
  });

  const integrantesBlock = form.querySelector("[data-integrantes-block]");
  if (integrantesBlock) {
    integrantesBlock.hidden = selectedFeria === FESTIVAL_FERIA_NAME;
  }

  updateProjectFormFieldsByFeria(form);

  const festivalCategorySelect = form.querySelector('select[name="categoria_festival"]');
  const festivalSubcategorySelect = form.querySelector('select[name="subcategoria_festival"]');
  const subcategoryWrap = form.querySelector("[data-festival-subcategory-wrap]");
  const expoCategorySelect = form.querySelector('select[name="categoria_expotecnica"]');
  const expoEjeWrap = form.querySelector("[data-expotecnica-eje-wrap]");
  const expoEjeSelect = form.querySelector('select[name="eje_tematico"]');

  if (festivalCategorySelect) {
    festivalCategorySelect.value = String(project.categoria_festival ?? "");
    const festivalCatValue = festivalCategorySelect.value;
    const isFestival = selectedFeria === FESTIVAL_FERIA_NAME;
    const hasCategory = isFestival && FESTIVAL_CATEGORIES.includes(festivalCatValue);

    if (subcategoryWrap) {
      subcategoryWrap.hidden = !hasCategory;
    }
    if (hasCategory && festivalSubcategorySelect) {
      const subcategories = FESTIVAL_SUBCATEGORIES[festivalCatValue] ?? [];
      festivalSubcategorySelect.innerHTML = [
        '<option value="">Selecciona una subcategoria</option>',
        ...subcategories.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
      ].join("");
      festivalSubcategorySelect.value = String(project.subcategoria_festival ?? "");
    }
  }

  const festivalLevelSelect = form.querySelector('[data-festival-level-select]');
  if (festivalLevelSelect) {
    festivalLevelSelect.value = String(project.nivel_educativo ?? "");
  }

  if (expoCategorySelect) {
    expoCategorySelect.value = String(project.categoria_expotecnica ?? "");
    const isExpotecnica = selectedFeria === "Feria Expotecnica";
    const hasExpoCategory = isExpotecnica && EXPOTECNICA_CATEGORIES.includes(expoCategorySelect.value);
    if (expoEjeWrap) {
      expoEjeWrap.hidden = !hasExpoCategory;
    }
    if (hasExpoCategory && expoEjeSelect) {
      expoEjeSelect.value = String(project.eje_tematico ?? "");
    }
  }

  const pronatecytSelect = form.querySelector('[data-pronatecyt-select]');
  const nivelCientificoSelect = form.querySelector('[data-nivel-cientifico-select]');
  const pronafecytCatWrap = form.querySelector('[data-pronafecyt-cat-wrap]');
  if (nivelCientificoSelect && selectedFeria === "Feria Cientifica y Tecnologica") {
    const stored = String(project.categoria_pronatecyt ?? "");
    const nivel = project.nivel_educativo || getNivelFromPronatecyt(stored);
    if (nivel) {
      nivelCientificoSelect.value = nivel;
      const nivelForms = PRONAFECYT_BY_NIVEL[nivel] ?? [];
      if (pronatecytSelect) {
        pronatecytSelect.innerHTML = [
          '<option value="">Selecciona un formulario</option>',
          ...nivelForms.map((f) => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`)
        ].join("");
        pronatecytSelect.value = stored;
      }
      if (pronafecytCatWrap) pronafecytCatWrap.hidden = false;
    }
    nivelCientificoSelect.addEventListener("change", () => updateProjectFormFieldsByFeria(form));
  }
  if (pronatecytSelect && selectedFeria !== "Feria Cientifica y Tecnologica") {
    const stored = String(project.categoria_pronatecyt ?? "");
    pronatecytSelect.value = stored;
  }

  festivalCategorySelect?.addEventListener("change", () => {
    const catValue = festivalCategorySelect.value;
    const isFest = selectedFeria === FESTIVAL_FERIA_NAME;
    const hasCat = isFest && FESTIVAL_CATEGORIES.includes(catValue);
    if (subcategoryWrap) {
      subcategoryWrap.hidden = !hasCat;
    }
    if (hasCat && festivalSubcategorySelect) {
      const subcategories = FESTIVAL_SUBCATEGORIES[catValue] ?? [];
      festivalSubcategorySelect.innerHTML = [
        '<option value="">Selecciona una subcategoria</option>',
        ...subcategories.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
      ].join("");
    } else if (festivalSubcategorySelect) {
      festivalSubcategorySelect.innerHTML = '<option value="">Selecciona una subcategoria</option>';
    }
  });

  expoCategorySelect?.addEventListener("change", () => {
    const catValue = expoCategorySelect.value;
    const isExp = selectedFeria === "Feria Expotecnica";
    const hasCat = isExp && EXPOTECNICA_CATEGORIES.includes(catValue);
    if (expoEjeWrap) {
      expoEjeWrap.hidden = !hasCat;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const projectId = formData.get("project_id");
    const titulo = String(formData.get("titulo") ?? "").trim();
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const tipoFeria = String(formData.get("tipo_feria") ?? "").trim();
    const integrante1 = String(formData.get("integrante_1") ?? "").trim();
    const integrante2 = String(formData.get("integrante_2") ?? "").trim();
    const integrante3 = String(formData.get("integrante_3") ?? "").trim();
    const categoriaFestival = String(formData.get("categoria_festival") ?? "").trim();
    const subcategoriaFestival = String(formData.get("subcategoria_festival") ?? "").trim();
    const nivelFestival = String(formData.get("nivel_festival") ?? "").trim();
    const participacion = String(formData.get("participacion") ?? "").trim();
    const categoriaExpotecnica = String(formData.get("categoria_expotecnica") ?? "").trim();
    const ejeTematico = String(formData.get("eje_tematico") ?? "").trim();
    const categoriaPronatecyt = String(formData.get("categoria_pronatecyt") ?? "").trim();
    const nivelEducativo = String(formData.get("nivel_cientifico") ?? "").trim();
    const fechaEvaluacion = String(formData.get("fecha_evaluacion") ?? "").trim();
    const isFestival = tipoFeria === FESTIVAL_FERIA_NAME;
    const isExpotecnica = tipoFeria === "Feria Expotecnica";
    const isScientific = tipoFeria === "Feria Cientifica y Tecnologica";

    if (isFestival && (!FESTIVAL_CATEGORIES.includes(categoriaFestival) || !(FESTIVAL_SUBCATEGORIES[categoriaFestival] ?? []).includes(subcategoriaFestival) || !FESTIVAL_EDUCATIONAL_LEVELS.includes(nivelFestival) || !participacion)) {
      showToast("Para Festival debes seleccionar categoria, subcategoria, nivel educativo y participacion.", "error");
      return;
    }

    if (isScientific && (!PRONAFECYT_BY_NIVEL[nivelEducativo] || !PRONAFECYT_CATEGORIES.includes(categoriaPronatecyt))) {
      showToast("Para Feria Cientifica debes seleccionar categoria educativa y formulario PRONAFECYT.", "error");
      return;
    }

    const data = {
      titulo,
      descripcion: descripcion || null,
      tipo_feria: tipoFeria,
      nivel_educativo: isFestival ? nivelFestival : isScientific ? nivelEducativo || null : null,
      integrante_1: isFestival ? null : integrante1 || null,
      integrante_2: isFestival ? null : integrante2 || null,
      integrante_3: isFestival ? null : integrante3 || null,
      categoria_festival: isFestival ? categoriaFestival : null,
      subcategoria_festival: isFestival ? subcategoriaFestival : null,
      participacion: participacion || null,
      categoria_expotecnica: isExpotecnica ? categoriaExpotecnica : null,
      eje_tematico: isExpotecnica ? ejeTematico : null,
      categoria_pronatecyt: isScientific ? categoriaPronatecyt : null,
      fecha_evaluacion: fechaEvaluacion || null
    };

    try {
      await updateProject(projectId, data);
      showToast("Proyecto actualizado correctamente.", "success");
      closeModalAccesible(overlay);
      overlay.remove();
      document.dispatchEvent(new CustomEvent("projects-changed"));
    } catch (err) {
      showToast(err?.message || "No se pudo actualizar el proyecto.", "error");
    }
  });

  overlay.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    closeModalAccesible(overlay);
    overlay.remove();
  });
  overlay.querySelector("[data-close-modal]")?.addEventListener("click", () => {
    closeModalAccesible(overlay);
    overlay.remove();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModalAccesible(overlay);
      overlay.remove();
    }
  });
}

async function updateProject(projectId, data) {
  const { error } = await supabase.rpc("admin_save_project", {
    p_session_token: getSession()?.session_token,
    p_data: { id: projectId, ...data }
  });
  if (error) throw error;
}

async function deleteUser(userId) {
  const { error } = await supabase.rpc("admin_delete_user", {
    p_session_token: getSession()?.session_token,
    p_user_id: userId
  });
  if (error) throw error;
}
