import { supabase } from "./supabase.js";
import { escapeHTML, showToast, setMessage, fillSelectGroupedByTipo, setupHamburgerMenu, setupHideOnScroll, highlightActiveNavLink, FESTIVAL_FERIA_NAME, renderJudgeRubric } from "./utils.js";
import { enforceRole, bindLogout } from "./auth.js";
import { loadAssignedProjectsForJudge, fetchAllRpc } from "./data.js";
import { getRubricIndicatorsByFeria, getExpotecnicaRubricByCategory, getPronatecytRubricByCategory, getFestivalRubricBySubcategory, getFestivalRubricByCategory } from "./rubrics.js";
import { generateJudgePDF } from "./pdf.js";

export async function bootstrapJudgePage() {
  bindLogout();
  highlightActiveNavLink();
  setupHideOnScroll();
  setupHamburgerMenu();

  const user = await enforceRole("Juez");

  if (!user) {
    return;
  }

  const judgeName = document.querySelector("[data-judge-name]");
  const feriaTag = document.querySelector("[data-feria-tag]");
  const userFeria = String(user.tipo_feria ?? "");

  if (judgeName) {
    judgeName.textContent = user.nombre;
  }
  if (feriaTag) {
    feriaTag.textContent = user.tipo_feria ?? "";
  }

  const evaluationForm = document.querySelector("[data-evaluation-form]");
  const evaluationStatus = document.querySelector("[data-evaluation-form-status]");
  const myEvaluationsStatus = document.querySelector("[data-my-evaluations-status]");
  const myEvaluationsList = document.querySelector("[data-my-evaluations]");
  const projectSelect = document.querySelector("[data-project-select]");
  const dateFilter = document.querySelector("[data-judge-date-filter]");
  const dateSelect = document.querySelector("[data-judge-date-select]");
  const dateStatus = document.querySelector("[data-judge-date-status]");
  const categoryFilter = document.querySelector("[data-judge-category-filter]");
  const categorySelect = document.querySelector("[data-judge-category-select]");
  const categoryStatus = document.querySelector("[data-judge-category-status]");
  let assignedProjectsCache = [];
  let activeDateFilter = "";
  let activeCategoryFilter = "";
  let currentRubricModel = {
    indicators: getRubricIndicatorsByFeria(userFeria),
    scoreOptions: [
      { value: 3, label: "3" },
      { value: 2, label: "2" },
      { value: 1, label: "1" },
      { value: 0, label: "0" }
    ]
  };

  // The SQL migration exposes these draft RPCs. Keeping their names in one
  // place makes the client contract explicit and avoids scattering magic
  // strings through the form handlers.
  const draftRpc = {
    get: "get_judge_evaluation_draft",
    save: "save_judge_evaluation_draft",
    remove: "delete_judge_evaluation_draft"
  };
  let draftSaveTimer = null;
  let draftLoadToken = 0;
  let rubricLoadToken = 0;
  let draftStatusTimer = null;
  let lastDraftErrorToastAt = 0;

  function handleDraftConnectionChange() {
    if (navigator.onLine) {
      showToast("Conexión restaurada. Guardando borrador…", "success");
      const projectId = Number(projectSelect?.value);
      if (projectId) saveDraft(projectId);
      return;
    }
    setDraftStatus("Sin conexión: el borrador se guardará al reconectar", "error");
    showToast("Sin conexión. El respaldo se reintentará al reconectar.", "warning");
  }

  window.addEventListener("online", handleDraftConnectionChange);
  window.addEventListener("offline", handleDraftConnectionChange);

  function setDraftStatus(message, kind = "") {
    const status = document.querySelector("[data-evaluation-draft-status]");
    if (!status) return;
    status.textContent = message;
    if (kind) status.dataset.kind = kind;
    else status.removeAttribute("data-kind");
    clearTimeout(draftStatusTimer);
    if (message) {
      draftStatusTimer = setTimeout(() => {
        status.textContent = "";
        status.removeAttribute("data-kind");
      }, 3200);
    }
  }

  function getSelectedProjectType(projectId) {
    return assignedProjectsCache.find((p) => Number(p.id) === Number(projectId))?.tipo_evaluacion ?? "Exposición";
  }

  function readDraftForm(projectId) {
    if (!projectId) return { evaluations: [], observation: "" };
    const evaluations = [];
    let inputIndex = 0;
    currentRubricModel.indicators.forEach((item) => {
      if (item && typeof item === "object" && item.section) return;
      const text = typeof item === "string" ? item : (item?.text ?? "");
      const checked = document.querySelector(`input[name="indicador_${inputIndex}"]:checked`);
      if (checked) evaluations.push({ criterio: text, nota: Number(checked.value) });
      inputIndex++;
    });
    return {
      evaluations,
      observation: document.querySelector("[data-observacion-input]")?.value ?? ""
    };
  }

  async function saveDraft(projectId, draftData = readDraftForm(projectId)) {
    if (!projectId) return;
    const tipoEval = getSelectedProjectType(projectId);
    try {
      const { error } = await supabase.rpc(draftRpc.save, {
        p_session_token: user.session_token,
        p_project_id: Number(projectId),
        p_tipo_evaluacion: tipoEval,
        p_draft_data: draftData
      });
      if (error) throw error;
      setDraftStatus("Borrador guardado", "success");
    } catch {
      // Draft persistence must never interrupt the judge's evaluation flow.
      setDraftStatus("No se pudo guardar el borrador", "error");
      const now = Date.now();
      if (now - lastDraftErrorToastAt > 5000) {
        showToast("No se pudo guardar el borrador. Revisa tu conexión.", "error");
        lastDraftErrorToastAt = now;
      }
    }
  }

  function scheduleDraftSave() {
    clearTimeout(draftSaveTimer);
    const projectId = Number(projectSelect?.value);
    if (!projectId) return;
    // Capture the form while it still belongs to this project. If the judge
    // changes projects before the debounce expires, never persist the new
    // project's controls under the previous project's key.
    const draftData = readDraftForm(projectId);
    setDraftStatus("Guardando borrador…");
    draftSaveTimer = setTimeout(() => {
      if (Number(projectSelect?.value) === projectId) saveDraft(projectId, draftData);
    }, 650);
  }

  async function loadDraft(projectId, options = {}) {
    if (!projectId) return;
    const loadToken = ++draftLoadToken;
    const tipoEval = getSelectedProjectType(projectId);
    try {
      const { data, error } = await supabase.rpc(draftRpc.get, {
        p_session_token: user.session_token,
        p_project_id: Number(projectId),
        p_tipo_evaluacion: tipoEval
      });
      if (error || loadToken !== draftLoadToken || !data) return;
      const rows = Array.isArray(data) ? data : [data];
      const draftData = rows[0]?.draft_data ?? {};
      const draftEvaluations = Array.isArray(draftData.evaluations) ? draftData.evaluations : [];
      if (!options.skipEvaluations) {
        const lookup = new Map(draftEvaluations.filter((item) => item?.criterio).map((item) => [String(item.criterio).trim(), item.nota]));
        let inputIndex = 0;
        currentRubricModel.indicators.forEach((item) => {
          if (item && typeof item === "object" && item.section) return;
          const text = typeof item === "string" ? item : (item?.text ?? "");
          const saved = lookup.get(text.trim());
          if (saved !== undefined && saved !== null) {
            document.querySelectorAll(`input[name="indicador_${inputIndex}"]`).forEach((radio) => {
              radio.checked = Number(radio.value) === Number(saved);
            });
          }
          inputIndex++;
        });
      }
      const textarea = document.querySelector("[data-observacion-input]");
      if (!options.skipObservation && textarea && draftData.observation !== undefined) textarea.value = draftData.observation ?? "";
      if (rows.length) {
        setDraftStatus("Borrador recuperado", "success");
        showToast("Borrador recuperado correctamente.", "success");
      }
    } catch {
      // Missing/expired drafts are equivalent to an empty draft.
      showToast("No se pudo recuperar el borrador.", "error");
    }
  }

  async function deleteDraft(projectId) {
    if (!projectId) return;
    try {
      await supabase.rpc(draftRpc.remove, {
        p_session_token: user.session_token,
        p_project_id: Number(projectId),
        p_tipo_evaluacion: getSelectedProjectType(projectId)
      });
    } catch { /* best effort; completed evaluations remain authoritative */ }
  }

  function resolveRubricModelForProject(projectId) {
    const selectedProject = assignedProjectsCache.find((item) => Number(item.id) === Number(projectId));
    const projectFeria = selectedProject?.tipo_feria ?? userFeria;

    if (projectFeria === "Feria Expotecnica") {
      const expoCategory = selectedProject?.categoria_expotecnica ?? "";
      const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";
      const rubric = getExpotecnicaRubricByCategory(expoCategory, tipoEval);
      if (rubric?.sections?.length) {
        const allIndicators = rubric.sections.flatMap((section) => [
          { section: `${rubric.title} - ${section.title}` },
          ...section.indicators
        ]);
        return {
          indicators: allIndicators,
          scoreOptions: [
            { value: 3, label: "3 Logrado" },
            { value: 2, label: "2 Parcialmente logrado" },
            { value: 1, label: "1 No logrado" },
            { value: 0, label: "0 Ausente" }
          ]
        };
      }
      return {
        indicators: getRubricIndicatorsByFeria(projectFeria),
        scoreOptions: [
          { value: 3, label: "3" },
          { value: 2, label: "2" },
          { value: 1, label: "1" },
          { value: 0, label: "0" }
        ]
      };
    }

    if (projectFeria === "Feria Cientifica y Tecnologica") {
      const pronatecytCategory = selectedProject?.categoria_pronatecyt ?? "";
      const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";
      if (pronatecytCategory) {
        const categoryKey = tipoEval === "Escrito" ? pronatecytCategory.replace("B -", "C -") : pronatecytCategory;
        const rubric = getPronatecytRubricByCategory(categoryKey);
        if (rubric) return rubric;
      }
    }

    if (projectFeria !== FESTIVAL_FERIA_NAME) {
      return {
        indicators: getRubricIndicatorsByFeria(projectFeria),
        scoreOptions: [
          { value: 3, label: "3" },
          { value: 2, label: "2" },
          { value: 1, label: "1" },
          { value: 0, label: "0" }
        ]
      };
    }

    const subcategoryRubric = getFestivalRubricBySubcategory(selectedProject?.subcategoria_festival ?? "");
    if (subcategoryRubric) {
      return subcategoryRubric;
    }

    return getFestivalRubricByCategory(selectedProject?.categoria_festival ?? "");
  }

  function applyRubricForSelection(projectId) {
    const selectionToken = ++rubricLoadToken;
    currentRubricModel = resolveRubricModelForProject(projectId);
    renderJudgeRubric(currentRubricModel.indicators, currentRubricModel.scoreOptions);
    Promise.all([loadSavedEvaluations(projectId, selectionToken), loadSavedObservacion(projectId, selectionToken)]).then(([hasSavedEvaluation, hasSavedObservation]) => {
      if (selectionToken !== rubricLoadToken || Number(projectSelect?.value) !== Number(projectId)) return;
      loadDraft(projectId, { skipEvaluations: hasSavedEvaluation, skipObservation: hasSavedObservation });
    });

    const badge = document.querySelector("[data-evaluation-type-badge]");
    if (badge) {
      const selectedProject = assignedProjectsCache.find((item) => Number(item.id) === Number(projectId));
      const tipo = selectedProject?.tipo_evaluacion ?? "Exposición";
      badge.textContent = tipo;
      badge.dataset.tipo = tipo;
      badge.hidden = false;
    }
  }

  async function loadSavedEvaluations(projectId, selectionToken) {
    if (!projectId) return false;
    const selectedProject = assignedProjectsCache.find((p) => Number(p.id) === Number(projectId));
    const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";
    const { data, error } = await supabase.rpc("get_judge_evaluations", {
      p_session_token: user.session_token,
      p_project_id: Number(projectId),
      p_tipo_evaluacion: tipoEval
    });
    if (selectionToken !== rubricLoadToken || Number(projectSelect?.value) !== Number(projectId)) return false;
    if (error || !data || !data.length) return false;
    const lookup = new Map(data.map((r) => [r.criterio.trim(), r.nota]));
    let inputIndex = 0;
    currentRubricModel.indicators.forEach((item) => {
      if (item && typeof item === "object" && item.section) return;
      const text = typeof item === "string" ? item : (item?.text ?? "");
      const saved = lookup.get(text.trim());
      if (saved !== undefined) {
        const radios = document.querySelectorAll(`input[name="indicador_${inputIndex}"]`);
        radios.forEach((radio) => {
          if (Number(radio.value) === Number(saved)) {
            radio.checked = true;
          }
        });
      }
      inputIndex++;
    });
    return true;
  }

  async function loadSavedObservacion(projectId, selectionToken) {
    const textarea = document.querySelector("[data-observacion-input]");
    if (!textarea || !projectId) {
      if (textarea) textarea.value = "";
      return false;
    }
    const selectedProject = assignedProjectsCache.find((p) => Number(p.id) === Number(projectId));
    const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";
    const { data, error } = await supabase.rpc("get_judge_observation", {
      p_session_token: user.session_token,
      p_project_id: Number(projectId),
      p_tipo_evaluacion: tipoEval
    });
    if (selectionToken !== rubricLoadToken || Number(projectSelect?.value) !== Number(projectId)) return false;
    if (error) {
      return false;
    }
    textarea.value = (Array.isArray(data) ? data[0]?.texto : data?.texto) ?? "";
    return Boolean(textarea.value.trim());
  }

  async function saveObservacion(projectId, judgeId, tipoEval, texto) {
    const trimmed = String(texto ?? "").trim();
    if (!projectId || !judgeId) return;

    try {
      await supabase.rpc("save_observation", {
        p_session_token: user.session_token,
        p_proyecto_id: projectId,
        p_tipo_evaluacion: tipoEval,
        p_texto: trimmed
      });
    } catch { /* ignorar: fallo silencioso de carga */ }
  }

  function formatEvaluationDate(value) {
    if (!value) return "";
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function populateDateFilter(projects) {
    if (!dateSelect || !dateFilter) return;

    const dates = [...new Set(projects.map((project) => project.fecha_evaluacion).filter(Boolean))].sort();
    dateFilter.hidden = dates.length === 0;
    if (!dates.length) return;

    const currentValue = dateSelect.value;
    dateSelect.innerHTML = '<option value="">Todos los proyectos</option>';
    dates.forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = formatEvaluationDate(date);
      dateSelect.appendChild(option);
    });
    if (currentValue && dates.includes(currentValue)) {
      dateSelect.value = currentValue;
    }
  }

  function populateCategoryFilter(projects) {
    if (!categorySelect || !categoryFilter) return;

    const projectFeria = projects.length ? (projects[0].tipo_feria ?? userFeria) : userFeria;
    const isFestival = projectFeria === FESTIVAL_FERIA_NAME;
    const isExpotecnica = projectFeria === "Feria Expotecnica";
    const isScientific = projectFeria === "Feria Cientifica y Tecnologica";
    const hasCategories = isFestival || isExpotecnica || isScientific;

    if (!hasCategories || !projects.length) {
      categoryFilter.hidden = true;
      return;
    }

    let categoryField = "categoria_festival";
    if (isExpotecnica) categoryField = "categoria_expotecnica";
    if (isScientific) categoryField = "categoria_pronatecyt";
    const uniqueCategories = [...new Set(projects.map((p) => p[categoryField]).filter(Boolean))];

    if (uniqueCategories.length <= 1) {
      categoryFilter.hidden = true;
      return;
    }

    categoryFilter.hidden = false;
    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Todas las categorias</option>';
    uniqueCategories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
    if (currentValue && uniqueCategories.includes(currentValue)) {
      categorySelect.value = currentValue;
    }
  }

  function getFilteredProjects(projects) {
    const dateFilteredProjects = activeDateFilter
      ? projects.filter((project) => project.fecha_evaluacion === activeDateFilter)
      : projects;

    if (!activeCategoryFilter) return dateFilteredProjects;

    const projectFeria = dateFilteredProjects.length ? (dateFilteredProjects[0].tipo_feria ?? userFeria) : userFeria;
    const isFestival = projectFeria === FESTIVAL_FERIA_NAME;
    const isScientific = projectFeria === "Feria Cientifica y Tecnologica";
    let categoryField = isFestival ? "categoria_festival" : "categoria_expotecnica";
    if (isScientific) categoryField = "categoria_pronatecyt";
    return dateFilteredProjects.filter((p) => String(p[categoryField] ?? "") === activeCategoryFilter);
  }

  async function refreshJudgeData() {
    try {
      const assignedProjects = await loadAssignedProjectsForJudge();
      assignedProjectsCache = assignedProjects;

      populateDateFilter(assignedProjects);
      populateCategoryFilter(assignedProjects);

      const filteredProjects = getFilteredProjects(assignedProjects);

      const projectsForSelect = filteredProjects.map((item) => {
        if (userFeria === FESTIVAL_FERIA_NAME && item.categoria_festival) {
          const disciplineLabel = item.subcategoria_festival || item.categoria_festival;
          return {
            ...item,
            titulo: `${item.titulo} (${disciplineLabel})`
          };
        }

        if (userFeria === "Feria Expotecnica" && item.categoria_expotecnica) {
          const disciplineLabel = item.eje_tematico || item.categoria_expotecnica;
          return {
            ...item,
            titulo: `${item.titulo} (${disciplineLabel})`
          };
        }

        if (userFeria === "Feria Cientifica y Tecnologica" && item.categoria_pronatecyt) {
          return {
            ...item,
            titulo: `${item.titulo} (${item.categoria_pronatecyt})`
          };
        }

        return item;
      });

      const previousProjectId = projectSelect?.value;
      fillSelectGroupedByTipo(projectSelect, projectsForSelect, new Set());
      const previousProjectIsVisible = projectsForSelect.some((project) => Number(project.id) === Number(previousProjectId));
      if (projectSelect) {
        projectSelect.value = previousProjectIsVisible ? previousProjectId : String(filteredProjects[0]?.id ?? "");
      }
      applyRubricForSelection(projectSelect?.value ?? "");

      if (!filteredProjects.length) {
        const msg = activeDateFilter
          ? `No hay proyectos programados para ${formatEvaluationDate(activeDateFilter)}.`
          : activeCategoryFilter
          ? `No hay proyectos en la categoria "${activeCategoryFilter}".`
          : "Este juez no tiene proyectos asignados por el admin.";
        setMessage(evaluationStatus, msg, "error");
      }

      const data = await fetchAllRpc("get_judge_evaluations_with_titles", {
        p_session_token: user.session_token
      });

      const evaluatedKeys = new Set(data.map((e) => `${e.proyecto_id}-${e.tipo_evaluacion ?? "Exposición"}`));
      const evaluatedProjectIds = new Set(data.map((e) => e.proyecto_id));

      const progressSection = document.querySelector("[data-judge-progress]");
      if (progressSection) {
        const total = assignedProjectsCache.length;
        const evaluated = evaluatedProjectIds.size;
        const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;
        const evaluatedEl = document.querySelector("[data-progress-evaluated]");
        const totalEl = document.querySelector("[data-progress-total]");
        const percentEl = document.querySelector("[data-progress-percent]");
        const barEl = document.querySelector("[data-progress-bar]");
        if (evaluatedEl) evaluatedEl.textContent = evaluated;
        if (totalEl) totalEl.textContent = total;
        if (percentEl) percentEl.textContent = `${percent}%`;
        if (barEl) barEl.style.width = `${percent}%`;
        progressSection.hidden = false;
      }

      const prevVal = projectSelect?.value;
      fillSelectGroupedByTipo(projectSelect, projectsForSelect, evaluatedKeys);
      if (projectSelect && prevVal) {
        projectSelect.value = prevVal;
      }

      const pdfBtn = document.querySelector("[data-pdf-btn]");
      if (!myEvaluationsList) {
        return;
      }

      if (!data || data.length === 0) {
        myEvaluationsList.innerHTML = '<tr><td colspan="3">No has registrado evaluaciones.</td></tr>';
        if (pdfBtn) pdfBtn.hidden = true;
        return;
      }

      const groupedByProject = new Map();

      data.forEach((item) => {
        const projectId = Number(item.proyecto_id);
        const tipo = item.tipo_evaluacion ?? "Exposición";
        const key = `${Number.isFinite(projectId) ? String(projectId) : "?"}-${tipo}`;

        if (!groupedByProject.has(key)) {
          const titulo = item.titulo || item.proyectos_ferias?.titulo || `Proyecto #${projectId}`;
          groupedByProject.set(key, {
            titulo,
            proyecto_id: projectId,
            tipo: tipo,
            valores: [],
            items: [],
            total: 0
          });
        }

        const current = groupedByProject.get(key);
        const nota = Number(item.nota);
        current.valores.push(`${item.criterio}: ${Number.isNaN(nota) ? 0 : nota}`);
        current.items.push({ criterio: item.criterio, nota: Number.isNaN(nota) ? 0 : nota });
        current.total += Number.isNaN(nota) ? 0 : nota;
      });

      myEvaluationsList.innerHTML = [...groupedByProject.values()]
        .map(
          (item) =>
            `<tr><td>${escapeHTML(item.titulo)} <span class="tipo-badge tipo-badge--${item.tipo === "Escrito" ? "escrito" : "expo"}">${escapeHTML(item.tipo)}</span></td><td class="text-muted">${item.valores.length} indicadores</td><td class="total-cell">${item.total}</td></tr>`
        )
        .join("");

      if (pdfBtn) pdfBtn.hidden = false;

      setMessage(myEvaluationsStatus, "Evaluaciones cargadas.", "success");
    } catch {
      setMessage(myEvaluationsStatus, "No se pudieron cargar tus evaluaciones.", "error");
    }
  }

  await refreshJudgeData();

  document.querySelector("[data-pdf-btn]")?.addEventListener("click", async () => {
    const btn = document.querySelector("[data-pdf-btn]");
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = "Generando PDF...";
    try {
      await generateJudgePDF(user);
      showToast("PDF descargado correctamente.", "success");
    } catch {
      showToast("No se pudo generar el PDF.", "error");
    }
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg> PDF';
  });

  projectSelect?.addEventListener("change", () => {
    applyRubricForSelection(projectSelect.value);
  });

  categorySelect?.addEventListener("change", () => {
    activeCategoryFilter = categorySelect.value;
    if (categoryStatus) {
      if (activeCategoryFilter) {
        setMessage(categoryStatus, `Mostrando proyectos de: ${activeCategoryFilter}`, "success");
      } else {
        categoryStatus.textContent = "";
        categoryStatus.removeAttribute("data-kind");
      }
    }
    refreshJudgeData();
  });

  dateSelect?.addEventListener("change", () => {
    activeDateFilter = dateSelect.value;
    if (dateStatus) {
      if (activeDateFilter) {
        setMessage(dateStatus, `Mostrando proyectos del ${formatEvaluationDate(activeDateFilter)}.`, "success");
      } else {
        dateStatus.textContent = "";
        dateStatus.removeAttribute("data-kind");
      }
    }
    refreshJudgeData();
  });

  if (!evaluationForm) {
    return;
  }

  evaluationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = evaluationForm.querySelector("button[type=submit]");
    const originalText = btn.textContent;

    const formData = new FormData(evaluationForm);
    const proyectoId = Number(formData.get("proyecto_id"));
    let inputIndex = 0;
    const evaluaciones = [];
    currentRubricModel.indicators.forEach((item) => {
      if (item && typeof item === "object" && item.section) return;
      const text = typeof item === "string" ? item : (item?.text ?? "");
      const nota = Number(formData.get(`indicador_${inputIndex}`));
      evaluaciones.push({ criterio: text, nota });
      inputIndex++;
    });

    if (!proyectoId || evaluaciones.some((item) => Number.isNaN(item.nota))) {
      showToast("Completa todos los campos de la evaluacion.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Guardando...";

      const selectedProject = assignedProjectsCache.find((p) => Number(p.id) === Number(proyectoId));
      const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";

      try {
        const payload = evaluaciones.map((item) => ({
          proyecto_id: proyectoId,
          juez_id: user.id,
          tipo_evaluacion: tipoEval,
          criterio: item.criterio,
          nota: item.nota
        }));

        for (const item of payload) {
          const { error } = await supabase.rpc("save_evaluation", {
            p_session_token: user.session_token,
            p_proyecto_id: item.proyecto_id,
            p_criterio: item.criterio,
            p_nota: item.nota,
            p_tipo_evaluacion: item.tipo_evaluacion
          });
          if (error) throw error;
        }

        const observacionTexto = String(formData.get("observacion") ?? "");
        try { await saveObservacion(proyectoId, user.id, tipoEval, observacionTexto); } catch { /* ignorar */ } // ponytail: fallo silencioso si tabla no existe

      clearTimeout(draftSaveTimer);
      await deleteDraft(proyectoId);

      evaluationForm.reset();
      showToast("Evaluacion guardada correctamente.", "success");
      await refreshJudgeData();
    } catch {
      showToast("No se pudo guardar la evaluacion.", "error");
    }

    btn.disabled = false;
    btn.textContent = originalText;
  });

  evaluationForm.addEventListener("change", (event) => {
    if (event.target.matches('input[type="radio"][name^="indicador_"]')) scheduleDraftSave();
  });
  evaluationForm.querySelector("[data-observacion-input]")?.addEventListener("input", scheduleDraftSave);
}

