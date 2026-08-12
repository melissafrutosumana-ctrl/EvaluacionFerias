import { supabase } from "./supabase.js";
import { escapeHTML, showToast, setMessage, normalizeRoleName, isMissingColumnError, fillSelect, setupHamburgerMenu, setupHideOnScroll, highlightActiveNavLink, buildFeriaOptions, FESTIVAL_FERIA_NAME, FESTIVAL_CATEGORIES, FESTIVAL_SUBCATEGORIES, EXPOTECNICA_CATEGORIES, EXPOTECNICA_EJES, PRONAFECYT_CATEGORIES, updateProjectFormFieldsByFeria, showSkeleton, PRONAFECYT_BY_NIVEL, getNivelFromPronatecyt, renderJudgeRubric } from "./utils.js";
import { getSession, clearSession, restoreAppSession, enforceRole, hashPassword, bindLogout } from "./auth.js";
import { loadProjects, loadJudges, loadJudgeAssignments, loadUsers, fetchAllEvaluations } from "./data.js";
import { generateAdminPDF } from "./pdf.js";

function renderUsersTable(users, roles) {
    const tbody = document.querySelector("[data-users-table]");
    const status = document.querySelector("[data-users-table-status]");

    if (!tbody) {
        return;
    }

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados.</td></tr>';
        setMessage(status, "", "info");
        return;
    }

    const roleNamesById = new Map((roles ?? []).map((role) => [role.id, normalizeRoleName(role.nombre)]));

    tbody.innerHTML = users
        .map((item) => {
            const roleName = roleNamesById.get(item.role_id) ?? "Sin rol";
            const roleClass = roleName === "administrador" ? "role-badge role-admin" : roleName === "Juez" ? "role-badge role-judge" : "role-badge";
            return `<tr>
        <td>${escapeHTML(item.nombre)}</td>
        <td><span class="${roleClass}">${escapeHTML(roleName)}</span></td>
        <td>${escapeHTML(item.tipo_feria ?? "-")}</td>
        <td>
          <button class="table-action-btn edit-user-btn" data-edit-user='${JSON.stringify({ id: item.id, nombre: item.nombre, role_id: item.role_id, tipo_feria: item.tipo_feria })}'>Editar</button>
          <button class="table-action-btn delete-user-btn" data-delete-user-id="${item.id}">Eliminar</button>
        </td>
      </tr>`;
        })
        .join("");

    setMessage(status, "Usuarios.", "success");
}

function renderProjectsManagementTable(projects) {
    const tbody = document.querySelector("[data-projects-table]");
    const status = document.querySelector("[data-projects-table-status]");

    if (!tbody) {
        return;
    }

    if (!projects.length) {
        tbody.innerHTML = '<tr><td colspan="5">No hay proyectos registrados para esta feria.</td></tr>';
        setMessage(status, "", "info");
        return;
    }

    tbody.innerHTML = projects
        .map(
            (item) => {
                const feriaType = String(item.tipo_feria ?? "");
                const isFestival = feriaType === FESTIVAL_FERIA_NAME;
                const isExpotecnica = feriaType === "Feria Expotecnica";
                let detailText = "-";

                if (isFestival) {
                    const parts = [];
                    const category = String(item.categoria_festival ?? "").trim();
                    const subcategory = String(item.subcategoria_festival ?? "").trim();
                    const participation = String(item.participacion ?? "").trim();

                    if (category) {
                        parts.push(`Categoria: ${category}`);
                    }

                    if (subcategory) {
                        parts.push(`Subcategoria: ${subcategory}`);
                    }

                    if (participation) {
                        parts.push(`Participacion: ${participation}`);
                    }

                    detailText = parts.length ? parts.join(" | ") : "-";
                } else if (isExpotecnica) {
                    const parts = [];
                    const category = String(item.categoria_expotecnica ?? "").trim();
                    const eje = String(item.eje_tematico ?? "").trim();

                    if (category) {
                        parts.push(`Categoria: ${category}`);
                    }

                    if (eje) {
                        parts.push(`Eje: ${eje}`);
                    }

                    detailText = parts.length ? parts.join(" | ") : "-";
                } else if (feriaType === "Feria Cientifica y Tecnologica") {
                    const parts = [];
                    const pronatecyt = String(item.categoria_pronatecyt ?? "").trim();
                    const integrantes = [item.integrante_1, item.integrante_2, item.integrante_3]
                        .map((name) => String(name ?? "").trim())
                        .filter(Boolean);

                    if (pronatecyt) {
                        parts.push(`PRONAFECYT: ${pronatecyt}`);
                    }
                    if (integrantes.length) {
                        parts.push(`Integrantes: ${integrantes.join(", ")}`);
                    }
                    detailText = parts.length ? parts.join(" | ") : "-";
                } else {
                    const integrantes = [item.integrante_1, item.integrante_2, item.integrante_3]
                        .map((name) => String(name ?? "").trim())
                        .filter(Boolean);
                    detailText = integrantes.length ? integrantes.join(" | ") : "-";
                }

                return `
        <tr>
          <td>${escapeHTML(item.titulo)}</td>
          <td>${escapeHTML(item.tipo_feria ?? "-")}</td>
          <td>${escapeHTML(detailText)}</td>
          <td>${item.id}</td>
          <td>
            <button class="table-action-btn edit-project-btn" data-project-id="${item.id}">Editar</button>
            <button class="table-action-btn delete-project-btn" data-delete-project-id="${item.id}">Eliminar</button>
          </td>
        </tr>
      `;
            }
        )
        .join("");

    setMessage(status, "Proyectos cargados.", "success");
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

    if (!rows.length) {
        container.innerHTML = '<p class="form-status">No hay evaluaciones en esta feria.</p>';
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

    const panels = document.createElement("div");
    panels.className = "eval-tab-panels";

    projectIds.forEach((pid, i) => {
        const data = grouped.get(pid);
        const isActive = i === 0;

        const btn = document.createElement("button");
        btn.className = `eval-tab${isActive ? " active" : ""}`;
        btn.dataset.evalTab = pid;
        btn.textContent = data.title;
        tabBar.appendChild(btn);

        const panel = document.createElement("div");
        panel.className = `eval-tab-panel${isActive ? " active" : ""}`;
        panel.dataset.evalPanel = pid;

        const tableWrap = document.createElement("div");
        tableWrap.className = "table-wrap";

        // Assign color per judge
        const judgeColors = [
            "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
            "#0891b2", "#e11d48", "#65a30d", "#7c3aed", "#d97706"
        ];
        const colorMap = new Map();
        const judgeIds = [...new Set(data.rows.map((r) => r.juez_id))].sort();
        judgeIds.forEach((jid, i) => colorMap.set(jid, judgeColors[i % judgeColors.length]));

        // Sort rows by judge so each judge's criteria appear together
        const sortedRows = [...data.rows].sort((a, b) => {
            const orderA = judgeIds.indexOf(a.juez_id);
            const orderB = judgeIds.indexOf(b.juez_id);
            return orderA - orderB;
        });

        const table = document.createElement("table");
        table.className = "results-table eval-table";
        table.innerHTML = `<thead><tr><th>Juez</th><th>Criterio</th><th>Nota</th></tr></thead>`;

        const tbody = document.createElement("tbody");
        let lastJuez = null;
        tbody.innerHTML = sortedRows
            .map((row) => {
                const judgeName = usersById.get(row.juez_id) ?.nombre ?? "Juez";
                const color = colorMap.get(row.juez_id) ?? "#6b7280";
                const isFirstOfJudge = row.juez_id !== lastJuez;
                lastJuez = row.juez_id;
                return `<tr class="eval-judge-row${isFirstOfJudge ? " eval-judge-first" : ""}" style="--judge-color:${color}"><td><span class="role-badge judge-color-badge" style="background:${color}18;color:${color};border-color:${color}33">${escapeHTML(judgeName)}</span></td><td>${escapeHTML(row.criterio)}</td><td class="eval-nota-cell">${row.nota}</td></tr>`;
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

        const pid = btn.dataset.evalTab;
        tabBar.querySelectorAll(".eval-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        panels.querySelectorAll(".eval-tab-panel").forEach((p) => {
            p.classList.toggle("active", p.dataset.evalPanel === pid);
        });
    });
}

function renderAdminProjectsTable(rows, projectsById) {
    const tbody = document.querySelector("[data-admin-projects]");

    if (!tbody) {
        return;
    }

    const projectIds = [...new Set(rows.map((item) => item.proyecto_id).filter(Boolean))];

    if (!projectIds.length) {
        tbody.innerHTML = '<tr><td colspan="2">No hay proyectos con evaluaciones en esta feria.</td></tr>';
        return;
    }

    tbody.innerHTML = projectIds
        .map((projectId) => {
            const projectName = projectsById.get(projectId) ?.titulo ?? "Proyecto";
            return `<tr><td>${escapeHTML(projectName)}</td><td>${projectId}</td></tr>`;
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

function calcAverage(judges) {
    const voted = judges.filter(j => j.voted);
    return voted.length ? voted.reduce((a, b) => a + b.sum, 0) / voted.length : 0;
}

function calcFinalScore(expoVoted, expoAvg, escritoVoted, escritoAvg) {
    if (expoVoted > 0 && escritoVoted > 0) return expoAvg * 0.5 + escritoAvg * 0.5;
    if (expoVoted > 0) return expoAvg;
    return escritoAvg;
}

function renderAdminScoresTable(rows, projectsById, assignmentsByProject, selectedFeria) {
    const tbody = document.querySelector("[data-project-results]");
    if (!tbody) return;

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
        tbody.innerHTML = '<tr><td colspan="4">No hay proyectos en esta feria.</td></tr>';
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
            getNivelFromPronatecyt(proj ?.categoria_pronatecyt) :
            (proj ?.categoria_expotecnica ?? proj ?.categoria_festival ?? null);
        const manualEscrito = proj ?.puntaje_escrito_manual != null ? Number(proj.puntaje_escrito_manual) : null;
        const escritoAvgFinal = manualEscrito !== null ? manualEscrito : escritoAvg;
        const escritoVotedFinal = manualEscrito !== null ? 1 : escritoVoted;

        let finalScore;
        const isScientific = proj ?.tipo_feria === "Feria Cientifica y Tecnologica";
        if (manualEscrito !== null) {
            finalScore = expoVoted > 0 ? expoAvg + manualEscrito : manualEscrito;
        } else if (isScientific) {
            finalScore = expoAvg + escritoAvg;
        } else {
            finalScore = calcFinalScore(expoVoted, expoAvg, escritoVotedFinal, escritoAvgFinal);
        }

        results.push({
            projectId,
            projectName: proj ?.titulo ?? "Proyecto",
            categoria: cat,
            manualEscrito,
            expoJudges,
            escritoJudges,
            expoTotal,
            expoVoted,
            escritoTotal,
            escritoVoted,
            finalScore
        });
    }

    results.sort((a, b) => b.finalScore - a.finalScore);

    const highScoreEl = document.querySelector("[data-highest-score]");
    if (highScoreEl && results.length > 0) {
        highScoreEl.textContent = results[0].finalScore.toFixed(0);
    }

    function buildProjectRow(r) {
        const totalVoted = r.expoVoted + r.escritoVoted;
        const totalAssigned = r.expoTotal + r.escritoTotal;
        const pct = totalAssigned > 0 ? Math.round(totalVoted / totalAssigned * 100) : 0;
        const barColor = pct === 100 ? "var(--secondary)" : pct > 50 ? "var(--secondary-light)" : "var(--ink-secondary)";
        const escritoCell = r.manualEscrito !== null ?
            `<span class="manual-score-display">${r.manualEscrito.toFixed(0)} <span class="judge-status">(manual)</span></span>
         <button class="btn-manual-escrito" data-project-id="${r.projectId}" data-current="${r.manualEscrito}" title="Editar puntaje manual">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
         </button>` :
            `${formatJudgeColumn(r.escritoJudges, r.escritoVoted, r.escritoTotal)}
         <br><button class="btn-manual-escrito" data-project-id="${r.projectId}" data-current="" title="Ingresar puntaje escrito manual">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
           Ingresar manual
         </button>`;
        return `<tr data-result-row="${r.projectId}">
      <td>
        <strong>${escapeHTML(r.projectName)}</strong>
        <div class="judge-progress-wrap">
          <div class="judge-progress-bar" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <span class="judge-status">${totalVoted}/${totalAssigned} jueces (${pct}%)</span>
      </td>
      <td>${formatJudgeColumn(r.expoJudges, r.expoVoted, r.expoTotal)}</td>
      <td class="escrito-cell">${escritoCell}</td>
      <td class="score-cell"><strong>${r.finalScore.toFixed(0)}</strong></td>
    </tr>`;
    }

    // Event delegation para guardar puntaje escrito manual
    tbody.addEventListener("click", async function handleManualClick(e) {
        const btn = e.target.closest(".btn-manual-escrito");
        if (!btn) return;
        const projectId = btn.dataset.projectId;
        const current = btn.dataset.current;
        const cell = btn.closest(".escrito-cell");
        if (!cell || cell.querySelector(".manual-escrito-form")) return;

        const originalContent = cell.innerHTML;
        cell.innerHTML = `
      <form class="manual-escrito-form" style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
        <input type="number" class="manual-escrito-input" min="0" max="100" step="0.1"
          value="${escapeHTML(current)}" placeholder="Puntaje (0-100)" style="width:90px;">
        <button type="submit" class="btn-primary btn-sm">Guardar</button>
        <button type="button" class="btn-secondary btn-sm manual-escrito-cancel">Cancelar</button>
      </form>`;

        cell.querySelector(".manual-escrito-cancel").addEventListener("click", () => {
            cell.innerHTML = originalContent;
        });

        cell.querySelector(".manual-escrito-form").addEventListener("submit", async(ev) => {
            ev.preventDefault();
            const val = cell.querySelector(".manual-escrito-input").value.trim();
            const num = val === "" ? null : Number(val);
            if (val !== "" && (isNaN(num) || num < 0 || num > 100)) {
                alert("Ingrese un puntaje entre 0 y 100.");
                return;
            }
            const { error } = await supabase
                .from("proyectos_ferias")
                .update({ puntaje_escrito_manual: num })
                .eq("id", projectId);
            if (error) {
                alert("Error al guardar: " + error.message);
                cell.innerHTML = originalContent;
                return;
            }
            // Refrescar tabla
            tbody.removeEventListener("click", handleManualClick);
            await renderAdminReportsByFeria();
        });
    }, { once: false });

    const groupByCategory = selectedFeria === "Feria Expotecnica" || selectedFeria === "Festival Estudiantil de las Artes" || selectedFeria === "Feria Cientifica y Tecnologica";

    if (groupByCategory) {
        const grouped = new Map();
        results.forEach((r) => {
            const cat = r.categoria || "Sin categoría";
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat).push(r);
        });

        const html = [];
        for (const [cat, items] of grouped) {
            html.push(`<tr class="category-group-row"><td colspan="4">${escapeHTML(cat)}</td></tr>`);
            items.forEach((r) => html.push(buildProjectRow(r)));
        }
        tbody.innerHTML = html.join("");
    } else {
        tbody.innerHTML = results.map(buildProjectRow).join("");
    }
}


async function renderAdminReportsByFeria() {
    const hasAnyReportTarget =
        document.querySelector("[data-admin-evaluations]") ||
        document.querySelector("[data-admin-projects]") ||
        document.querySelector("[data-project-results]");

    if (!hasAnyReportTarget) {
        return;
    }

    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";

    const [users, projectsResult, allEvals, assignmentsResult] = await Promise.all([
        loadUsers(),
        supabase.from("proyectos_ferias").select("id, titulo, tipo_feria, categoria_expotecnica, categoria_festival, categoria_pronatecyt, puntaje_escrito_manual"),
        fetchAllEvaluations(),
        supabase.from("asignaciones_jueces").select("juez_id, proyecto_id, tipo_evaluacion")
    ]);

    if (projectsResult.error) {
        throw projectsResult.error;
    }

    const allProjects = projectsResult.data ?? [];
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
    (assignmentsResult.data ?? []).forEach((a) => {
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
    renderAdminProjectsTable(filteredRows, projectsById);
    renderAdminScoresTable(filteredRows, projectsById, assignmentsByProject, selectedFeria);

    // Update summary cards
    const uniqueProjects = new Set(filteredRows.map((r) => r.proyecto_id));
    const uniqueJudges = new Set(filteredRows.map((r) => r.juez_id));
    const totalEval = filteredRows.length;

    const totalProjEl = document.querySelector("[data-total-projects]");
    const totalJudEl = document.querySelector("[data-total-judges]");
    const totalEvalEl = document.querySelector("[data-total-evaluations]");
    if (totalProjEl) totalProjEl.textContent = uniqueProjects.size;
    if (totalJudEl) totalJudEl.textContent = uniqueJudges.size;
    if (totalEvalEl) totalEvalEl.textContent = totalEval;

    const status = document.querySelector("[data-project-results-status]");
    if (status) {
        setMessage(status, "Resultados cargados.", "success");
    }
}


function renderJudgeAssignmentsTable(judges, projects, assignments) {
    const tbody = document.querySelector("[data-judge-assignments]");

    if (!tbody) {
        return;
    }

    if (!judges.length) {
        tbody.innerHTML = '<tr><td colspan="3">No hay jueces registrados.</td></tr>';
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
            tipo_evaluacion: assignment.tipo_evaluacion ?? "Exposición"
        });
        assignmentsByJudge.set(assignment.juez_id, current);
    });

    tbody.innerHTML = judges
        .map((judge) => {
            const judgeAssignments = assignmentsByJudge.get(judge.id) ?? [];

            const projectList = judgeAssignments.length ?
                judgeAssignments.map((a) =>
                    `${escapeHTML(a.titulo)} <span class="tipo-badge tipo-badge--${a.tipo_evaluacion === "Escrito" ? "escrito" : "expo"}">${escapeHTML(a.tipo_evaluacion)}</span>`
                ).join("<br>") :
                '<span class="text-muted">Sin proyectos asignados</span>';

            const count = judgeAssignments.length;

            return `
        <tr data-judge-row data-judge-id="${judge.id}">
          <td><strong>${escapeHTML(judge.nombre)}</strong></td>
          <td class="assigned-projects-cell">${projectList}</td>
          <td>
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

    if (!overlay) return;

    const searchEl = document.querySelector("[data-modal-search]");
    nameEl.textContent = `Juez: ${judgeName}`;
    overlay.hidden = false;
    searchEl.value = "";
    searchEl.focus();

    const assignedIds = new Set(currentAssignments.map((a) => a.id));
    const selectedTipoMap = new Map(currentAssignments.map((a) => [a.id, a.tipo_evaluacion]));

    let searchTerm = "";

    function normalize(str) {
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function renderList() {
        const rows = listEl.querySelectorAll("[data-project-row]");
        rows.forEach((row) => {
            const match = !searchTerm || normalize(row.querySelector(".modal-project-title").textContent).includes(searchTerm);
            row.style.display = match ? "" : "none";
        });

        const checkedCount = listEl.querySelectorAll("[data-project-checkbox]:checked").length;
        counterEl.textContent = `${checkedCount}/${allProjects.length} seleccionados`;

        listEl.querySelectorAll("[data-project-checkbox]").forEach((cb) => {
            const tipoSelect = cb.closest("[data-project-row]").querySelector("[data-tipo-select]");
            const parent = cb.closest("[data-project-row]");
            if (cb.checked) {
                parent.removeAttribute("data-disabled");
            } else {
                parent.setAttribute("data-disabled", "");
            }
        });

        listEl.querySelectorAll("[data-project-checkbox]:not(:checked)").forEach((cb) => {
            const parent = cb.closest("[data-project-row]");
            parent.setAttribute("data-disabled", "");
        });

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
                const tipoVal = supportsDualEval ?
                    (selectedTipoMap.get(project.id) ?? "Exposición") :
                    "Exposición";

                return `
      <div class="modal-project-row" data-project-row data-project-id="${project.id}">
        <label class="modal-project-label">
          <input type="checkbox" data-project-checkbox value="${project.id}" ${checked}>
          <span class="modal-project-title">${escapeHTML(project.titulo)}</span>
          <span class="modal-project-feria">${escapeHTML(project.tipo_feria ?? "")}</span>
        </label>
        <select data-tipo-select class="assignment-tipo-select"${!supportsDualEval ? " disabled" : ""}>
          <option value="Exposición">Exposición</option>
          ${supportsDualEval ? `<option value="Escrito" ${tipoVal === "Escrito" ? "selected" : ""}>Escrito</option>` : ""}
        </select>
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
    saveBtn.textContent = "Guardando...";

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
    saveBtn.textContent = "Guardar asignaciones";
  };

  document.querySelector("[data-modal-cancel]").onclick = () => closeAssignmentModal();
  document.querySelector("[data-modal-close]").onclick = () => closeAssignmentModal();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAssignmentModal();
  });
}

function closeAssignmentModal() {
  const overlay = document.querySelector("[data-assignment-modal]");
  if (overlay) overlay.hidden = true;
}

export async function bootstrapAdminPage() {
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
    feriaTag.textContent = user.tipo_feria ?? "";
  }

  const userForm = document.querySelector("[data-user-form]");
  const userStatus = document.querySelector("[data-user-form-status]");
  const projectForm = document.querySelector("[data-project-form]");
  const projectStatus = document.querySelector("[data-project-form-status]");

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
  }

  let allProjectsCache = [];
  let allAssignmentsCache = [];

  async function refreshAdminDataView() {
    const usersTbody = document.querySelector("[data-users-table]");
    const assignmentsTbody = document.querySelector("[data-assignments-tbody]");
    if (usersTbody) showSkeleton(usersTbody, 4);
    if (assignmentsTbody) showSkeleton(assignmentsTbody, 3);

    const [rolesResult, judgesResult, projectsResult, assignmentsResult, usersResult, allProjectsResult] = await Promise.all([
      supabase.from("roles").select("id, nombre").order("nombre", { ascending: true }),
      loadJudges(""),
      loadProjects(""),
      loadJudgeAssignments(),
      loadUsers(),
      supabase.from("proyectos_ferias").select("id, titulo, tipo_feria, categoria_pronatecyt").order("titulo", { ascending: true })
    ]);

    const roles = rolesResult.data ?? [];

    if (rolesResult.error) {
      throw rolesResult.error;
    }

    const judges = judgesResult;
    allProjectsCache = allProjectsResult.data ?? [];
    allAssignmentsCache = assignmentsResult;
    const projects = projectsResult;
    const assignments = assignmentsResult;
    const users = usersResult;

    fillSelect(document.querySelector("[data-user-role-select]"), getAllowedRolesForUserForm(roles), "Selecciona un rol");
    renderUsersTable(users, roles);
    renderProjectsManagementTable(projects);
    renderJudgeAssignmentsTable(judges, allProjectsCache, assignments);
    await renderAdminReportsByFeria();
  }

  try {
    await refreshAdminDataView();
  } catch {
    setMessage(userStatus, "No se pudieron cargar datos para el panel admin.", "error");
  }

  if (userForm) {
    userForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = userForm.querySelector("button[type=submit]");
      const originalText = btn.textContent;

      const formData = new FormData(userForm);
      const nombre = String(formData.get("nombre") ?? "").trim();
      const contrasena = String(formData.get("contrasena") ?? "");
      const tipoFeria = String(formData.get("tipo_feria") ?? "").trim();
      const roleId = Number(formData.get("role_id"));

      if (!nombre || !contrasena || !tipoFeria || !roleId) {
        showToast("Completa todos los campos del usuario.", "error");
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
    });
  }

  if (projectForm) {
    projectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
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
      const participacion = String(formData.get("participacion") ?? "").trim();
      const categoriaExpotecnica = String(formData.get("categoria_expotecnica") ?? "").trim();
      const ejeTematico = String(formData.get("eje_tematico") ?? "").trim();
      const categoriaPronatecyt = String(formData.get("categoria_pronatecyt") ?? "").trim();
      const isFestival = tipoFeria === FESTIVAL_FERIA_NAME;
      const isExpotecnica = tipoFeria === "Feria Expotecnica";
      const isScientific = tipoFeria === "Feria Cientifica y Tecnologica";

      if (!titulo || !tipoFeria) {
        showToast("Completa nombre y tipo de feria del proyecto.", "error");
        return;
      }

      if (!isFestival && (!integrante1 || !integrante2 || !integrante3)) {
        showToast("Completa los 3 integrantes del proyecto.", "error");
        return;
      }

      if (!isFestival && new Set([integrante1.toLowerCase(), integrante2.toLowerCase(), integrante3.toLowerCase()]).size !== 3) {
        showToast("Los nombres de integrantes deben ser diferentes.", "error");
        return;
      }

      if (isFestival) {
        if (!FESTIVAL_CATEGORIES.includes(categoriaFestival) || !(FESTIVAL_SUBCATEGORIES[categoriaFestival] ?? []).includes(subcategoriaFestival) || !participacion) {
          showToast("Para Festival debes seleccionar categoria, subcategoria y escribir la participacion.", "error");
          return;
        }
      } else if (isExpotecnica) {
        if (!EXPOTECNICA_CATEGORIES.includes(categoriaExpotecnica) || !EXPOTECNICA_EJES.includes(ejeTematico)) {
          showToast("Para ExpoTECNICA debes seleccionar categoria y eje tematico.", "error");
          return;
        }
      } else if (isScientific) {
        if (!PRONAFECYT_CATEGORIES.includes(categoriaPronatecyt)) {
          showToast("Para Feria Cientifica debes seleccionar una categoria PRONAFECYT.", "error");
          return;
        }
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const payload = {
          titulo,
          descripcion: descripcion || null,
          tipo_feria: tipoFeria,
          integrante_1: isFestival ? null : integrante1 || null,
          integrante_2: isFestival ? null : integrante2 || null,
          integrante_3: isFestival ? null : integrante3 || null,
          categoria_festival: isFestival ? categoriaFestival : null,
          subcategoria_festival: isFestival ? subcategoriaFestival : null,
          participacion: participacion || null,
          categoria_expotecnica: isExpotecnica ? categoriaExpotecnica : null,
          eje_tematico: isExpotecnica ? ejeTematico : null,
          categoria_pronatecyt: isScientific ? categoriaPronatecyt : null
        };

        const { data: newId, error } = await supabase.rpc("admin_save_project", {
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

  const usersTbody = document.querySelector("[data-users-table]");
  const projectsTbody = document.querySelector("[data-projects-table]");

  if (usersTbody) {
    usersTbody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest(".edit-user-btn");
      const deleteBtn = event.target.closest(".delete-user-btn");

      if (editBtn) {
        try {
          const userData = JSON.parse(editBtn.dataset.editUser);
          const rolesResult = await supabase.from("roles").select("id, nombre").order("nombre", { ascending: true });
          showEditUserModal(userData, rolesResult.data ?? []);
        } catch {
          showEditUserModal({ id: 0, nombre: "", role_id: 0, tipo_feria: "" }, []);
        }
      }

      if (deleteBtn) {
        const userId = Number(deleteBtn.dataset.deleteUserId);
        if (confirm("�Estas seguro de eliminar este usuario? Esta accion no se puede deshacer.")) {
          await deleteUser(userId);
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
        const { data, error } = await supabase.from("proyectos_ferias").select("*").eq("id", projectId).maybeSingle();
        if (error || !data) {
          showToast("Error al leer datos del proyecto.", "error");
          return;
        }
        showEditProjectModal(data);
        return;
      }

      if (!deleteBtn) {
        return;
      }

      const projectId = Number(deleteBtn.dataset.deleteProjectId);

      if (!projectId) {
        return;
      }

      if (confirm("¿Estas seguro de eliminar este proyecto? Tambien se eliminaran sus asignaciones y evaluaciones.")) {
        try {
          const { error } = await supabase.rpc("admin_delete_project", {
            p_session_token: getSession()?.session_token,
            p_project_id: projectId
          });

          if (error) {
            throw error;
          }

          showToast("Proyecto eliminado correctamente.", "success");
          await refreshAdminDataView();
        } catch (err) {
          showToast(err?.message || "No se pudo eliminar el proyecto.", "error");
        }
      }
    });
  }

  const feriaResultsFilter = document.querySelector("[data-feria-results-filter]");
  if (feriaResultsFilter) {
    feriaResultsFilter.addEventListener("change", () => {
      renderAdminReportsByFeria();
    });
  }

  const exportBtn = document.getElementById("export-pdf-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", generateAdminPDF);
  }

  if (document.querySelector("[data-observaciones-groups]")) {
    const feriaFilter = document.querySelector("[data-observaciones-feria-filter]");
    const proyectoFilter = document.querySelector("[data-observaciones-proyecto-filter]");
    const juezFilter = document.querySelector("[data-observaciones-juez-filter]");

    async function refreshObservaciones() {
      await renderAdminObservaciones(feriaFilter?.value ?? "", proyectoFilter, juezFilter);
    }

    await refreshObservaciones();

    feriaFilter?.addEventListener("change", refreshObservaciones);
    proyectoFilter?.addEventListener("change", refreshObservaciones);
    juezFilter?.addEventListener("change", refreshObservaciones);
  }

  document.addEventListener("users-changed", () => refreshAdminDataView());
  document.addEventListener("projects-changed", () => refreshAdminDataView());

}


async function renderAdminObservaciones(feriaType = "", proyectoFilter, juezFilter) {
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

  const [usersResult, projectsResult, observacionesResult] = await Promise.all([
    loadUsers(),
    supabase.from("proyectos_ferias").select("id, titulo, tipo_feria"),
    supabase.from("observaciones_proyectos").select("proyecto_id, juez_id, tipo_evaluacion, texto, created_at").order("created_at", { ascending: false })
  ]);

  if (observacionesResult.error) {
    container.innerHTML = '<p class="form-status form-status--error">No se pudieron cargar las observaciones.</p>';
    setMessage(status, "Error al cargar observaciones.", "error");
    return;
  }

  const allProjects = (projectsResult.data ?? []).filter((p) => !feriaType || p.tipo_feria === feriaType);
  const allUsers = usersResult ?? [];
  const usersById = new Map(allUsers.map((u) => [u.id, u]));
  const projectsById = new Map(allProjects.map((p) => [p.id, p]));
  const projectIdsInFeria = new Set(allProjects.map((p) => p.id));
  const rows = (observacionesResult.data ?? []).filter((r) => projectIdsInFeria.has(r.proyecto_id));

  const selectedProjectId = proyectoFilter ? Number(proyectoFilter.value) : 0;
  const selectedJudgeId = juezFilter ? Number(juezFilter.value) : 0;

  const filtered = rows.filter((r) => {
    if (selectedProjectId && Number(r.proyecto_id) !== selectedProjectId) return false;
    if (selectedJudgeId && Number(r.juez_id) !== selectedJudgeId) return false;
    return true;
  });

  // populate filter selects
  const projectOpts = allProjects.sort((a, b) => a.titulo.localeCompare(b.titulo));
  if (proyectoFilter) {
    const curVal = proyectoFilter.value;
    proyectoFilter.innerHTML = '<option value="">Todos los proyectos</option>'
      + projectOpts.map((p) => `<option value="${p.id}">${escapeHTML(p.titulo)}</option>`).join("");
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
    const hasFilters = selectedProjectId || selectedJudgeId;
    container.innerHTML = `<p class="form-status">${hasFilters ? "Ninguna observacion coincide con los filtros seleccionados." : "Aun no hay observaciones registradas. Las observaciones apareceran aqui a medida que los jueces evalúen proyectos."}</p>`;
    if (countBadge) { countBadge.textContent = "0"; countBadge.hidden = false; }
    setMessage(status, "Observaciones cargadas.", "success");
    return;
  }

  // group by proyecto
  const grouped = new Map();
  filtered.forEach((row) => {
    const pid = row.proyecto_id;
    if (!grouped.has(pid)) {
      grouped.set(pid, { title: projectsById.get(pid)?.titulo ?? "Proyecto", rows: [] });
    }
    grouped.get(pid).rows.push(row);
  });

  container.innerHTML = "";
  for (const [pid, data] of grouped) {
    const block = document.createElement("div");
    block.className = "observacion-group";

    const heading = document.createElement("div");
    heading.className = "observacion-group-heading";
    heading.textContent = data.title;
    block.appendChild(heading);

    data.rows.forEach((row) => {
      const judge = usersById.get(row.juez_id);
      const judgeName = judge?.nombre ?? `Juez #${row.juez_id}`;
      const tipo = row.tipo_evaluacion ?? "Exposición";
      const fecha = row.created_at ? new Date(row.created_at).toLocaleDateString("es-CR") : "";

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
      block.appendChild(item);
    });

    container.appendChild(block);
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
    .map((r) => `<option value="${r.id}" ${Number(r.id) === Number(user.role_id) ? "selected" : ""}>${normalizeRoleName(r.nombre)}</option>`)
    .join("");

  const feriaOptions = buildFeriaOptions(user.tipo_feria);

  const modal = document.createElement("div");
  modal.className = "edit-modal-box";

  modal.innerHTML = `
    <h3>Editar usuario</h3>
    <form id="edit-user-form" class="edit-modal-form">
      <input type="hidden" name="user_id" value="${user.id}">
      <label class="edit-modal-field">
        Nombre
        <input name="nombre" type="text" required value="${escapeHTML(user.nombre)}">
      </label>
      <label class="edit-modal-field">
        Nueva contraseña <span style="color:#94a3b8;font-size:0.75rem;">(dejar en blanco para mantener)</span>
        <input name="contrasena" type="password" autocomplete="new-password">
      </label>
      <label class="edit-modal-field">
        Tipo de feria
        <select name="tipo_feria" required>${feriaOptions}</select>
      </label>
      <label class="edit-modal-field">
        Rol
        <select name="role_id" required>${roleOptions}</select>
      </label>
      <div class="edit-modal-actions">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" id="edit-user-cancel" class="btn-secondary">Cancelar</button>
      </div>
      <p id="edit-user-status" class="edit-modal-status"></p>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById("edit-user-cancel").addEventListener("click", () => overlay.remove());

  document.getElementById("edit-user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("edit-user-status");
    const btn = e.target.querySelector("button[type=submit]");
    const originalText = btn.textContent;
    const formData = new FormData(e.target);
    const userId = Number(formData.get("user_id"));
    const nombre = String(formData.get("nombre") ?? "").trim();
    const contrasena = String(formData.get("contrasena") ?? "");
    const tipoFeria = String(formData.get("tipo_feria") ?? "").trim();
    const roleId = Number(formData.get("role_id"));

    if (!nombre || !tipoFeria || !roleId) {
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
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-content edit-project-modal">
      <div class="modal-header">
        <h2>Editar Proyecto</h2>
        <button class="modal-close-btn" data-close-modal>&times;</button>
      </div>
      <form data-edit-project-form>
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
            <input name="participacion" type="text" value="${escapeHTML(String(project.participacion ?? ""))}">
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
          </div>
        </div>

        <div data-feria-section="Feria Cientifica y Tecnologica">
          <div class="field-group">
            <label class="field-label">
              <span>Nivel educativo</span>
              <select name="nivel_cientifico" data-nivel-cientifico-select>
                <option value="">Selecciona un nivel</option>
                <option value="Primaria">Primaria (I y II Ciclos)</option>
                <option value="Secundaria">Secundaria (III Ciclo y Ed. Diversificada)</option>
                <option value="Educaci\u00f3n Especial">Educaci\u00f3n Especial</option>
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
          <button type="button" class="btn-secondary" data-cancel-edit>Cancelar</button>
          <button type="submit" class="btn-primary">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

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
    const nivel = getNivelFromPronatecyt(stored);
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
    const participacion = String(formData.get("participacion") ?? "").trim();
    const categoriaExpotecnica = String(formData.get("categoria_expotecnica") ?? "").trim();
    const ejeTematico = String(formData.get("eje_tematico") ?? "").trim();
    const categoriaPronatecyt = String(formData.get("categoria_pronatecyt") ?? "").trim();
    const isFestival = tipoFeria === FESTIVAL_FERIA_NAME;
    const isExpotecnica = tipoFeria === "Feria Expotecnica";
    const isScientific = tipoFeria === "Feria Cientifica y Tecnologica";

    const data = {
      titulo,
      descripcion: descripcion || null,
      tipo_feria: tipoFeria,
      integrante_1: isFestival ? null : integrante1 || null,
      integrante_2: isFestival ? null : integrante2 || null,
      integrante_3: isFestival ? null : integrante3 || null,
      categoria_festival: isFestival ? categoriaFestival : null,
      subcategoria_festival: isFestival ? subcategoriaFestival : null,
      participacion: participacion || null,
      categoria_expotecnica: isExpotecnica ? categoriaExpotecnica : null,
      eje_tematico: isExpotecnica ? ejeTematico : null,
      categoria_pronatecyt: isScientific ? categoriaPronatecyt : null
    };

    try {
      await updateProject(projectId, data);
      showToast("Proyecto actualizado correctamente.", "success");
      overlay.remove();
      document.dispatchEvent(new CustomEvent("projects-changed"));
    } catch (err) {
      showToast(err?.message || "No se pudo actualizar el proyecto.", "error");
    }
  });

  overlay.querySelector("[data-cancel-edit]")?.addEventListener("click", () => overlay.remove());
  overlay.querySelector("[data-close-modal]")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
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
