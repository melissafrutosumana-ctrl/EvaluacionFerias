import { supabase } from "./supabase.js?v=4";
import { enforceRole, bindLogout } from "./auth.js?v=3.35";
import { fetchAllRpc } from "./data.js?v=3.32";
import { escapeHTML, showToast } from "./utils.js?v=16.15";
import { icon } from "./icons.js?v=1";

function formatArchiveDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "Todos los días";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CR", options);
}

function formatArchiveSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Tamaño no disponible";
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 }).format(size / 1024) + " KB";
}

function decodePdf(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isValidEvaluationDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getArchiveEvaluationDates(projects) {
  return [...new Set((projects ?? [])
    .map((project) => project.fecha_evaluacion)
    .filter(isValidEvaluationDate))]
    .sort();
}

export function resolveArchivePageResults(archiveResult, projectsResult) {
  if (archiveResult.status !== "fulfilled") throw archiveResult.reason;
  if (archiveResult.value.error) throw archiveResult.value.error;

  return {
    archives: Array.isArray(archiveResult.value.data) ? archiveResult.value.data : [],
    projects: projectsResult.status === "fulfilled" ? projectsResult.value : [],
    projectsUnavailable: projectsResult.status === "rejected"
  };
}

export async function bootstrapResultsPdfArchivesPage() {
  const user = await enforceRole("administrador");
  if (!user) return;
  bindLogout();

  const list = document.querySelector("[data-results-pdf-archives]");
  const status = document.querySelector("[data-archive-status]");
  const count = document.querySelector("[data-archive-count]");
  const search = document.querySelector("[data-archive-search]");
  const dateFilter = document.querySelector("[data-archive-date]");
  if (!list || !status || !count || !search || !dateFilter) return;
  let loadedArchives = [];

  const populateDateFilter = (projects) => {
    const previousDate = dateFilter.value;
    const dates = getArchiveEvaluationDates(projects);
    dateFilter.replaceChildren(new Option("Todos los días", ""));
    dates.forEach((date) => dateFilter.add(new Option(formatArchiveDate(date), date)));
    dateFilter.value = dates.includes(previousDate) ? previousDate : "";
  };

  const render = (archives) => {
    const query = search.value.trim().toLocaleLowerCase("es-CR");
    const selectedDate = dateFilter.value;
    const filtered = archives.filter((archive) => {
      const matchesDate = !selectedDate || archive.evaluation_date === selectedDate;
      const text = `${archive.file_name} ${archive.feria}`.toLocaleLowerCase("es-CR");
      return matchesDate && (!query || text.includes(query));
    });

    count.textContent = `${filtered.length} ${filtered.length === 1 ? "archivo" : "archivos"}`;
    if (!filtered.length) {
      list.innerHTML = `<div class="archive-empty"><span class="archive-empty-mark" aria-hidden="true">—</span><strong>${archives.length ? "No hay archivos con esos filtros" : "Todavía no hay PDF guardados"}</strong><span>${archives.length ? "Cambia el día o la búsqueda." : "Los cortes diarios aparecerán aquí al guardarse evaluaciones."}</span></div>`;
      return;
    }

    list.innerHTML = filtered.map((archive) => {
      const generatedAt = new Date(archive.generated_at);
      const safeName = escapeHTML(archive.file_name);
      return `<article class="archive-item">
        <span class="archive-item-icon" aria-hidden="true">${icon("file-arrow-down", 20)}</span>
        <div class="archive-item-details">
          <strong>${safeName}</strong>
          <span>${escapeHTML(archive.feria)} · ${Number(archive.project_count) || 0} proyectos</span>
          <span>Evaluación: ${escapeHTML(formatArchiveDate(archive.evaluation_date))} · Guardado: ${escapeHTML(generatedAt.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }))}</span>
        </div>
        <span class="archive-item-size">${escapeHTML(formatArchiveSize(archive.file_size_bytes))}</span>
        <button class="btn-secondary btn-sm archive-download" type="button" data-download-archive="${Number(archive.id)}" aria-label="Descargar ${safeName}">${icon("file-arrow-down", 16)} Descargar</button>
      </article>`;
    }).join("");
  };

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-download-archive]");
    if (!button || button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const { data, error } = await supabase.rpc("get_admin_results_pdf_archive", {
        p_archive_id: Number(button.dataset.downloadArchive)
      });
      if (error) throw error;
      const archive = Array.isArray(data) ? data[0] : data;
      if (!archive?.pdf_base64 || !archive?.file_name) throw new Error("El archivo no está disponible.");

      const pdf = new Blob([decodePdf(archive.pdf_base64)], { type: "application/pdf" });
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download = archive.file_name;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast(error?.message || "No se pudo descargar el PDF archivado.", "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });

  search.addEventListener("input", () => render(loadedArchives));
  dateFilter.addEventListener("change", () => render(loadedArchives));

  try {
    const [archiveResult, projectsResult] = await Promise.allSettled([
      supabase.rpc("get_admin_results_pdf_archives", {}),
      fetchAllRpc("get_projects")
    ]);
    const pageResults = resolveArchivePageResults(archiveResult, projectsResult);
    loadedArchives = pageResults.archives;
    populateDateFilter(pageResults.projects);
    status.textContent = pageResults.projectsUnavailable
      ? "No se pudieron cargar los días con proyectos. El filtro solo mostrará «Todos los días»."
      : "";
    render(loadedArchives);
  } catch (error) {
    console.error("Error loading results PDF archive:", error);
    status.textContent = "No se pudo cargar el archivo. Confirma que la migración de Supabase esté aplicada.";
    count.textContent = "Sin conexión";
    list.innerHTML = "";
  }
}
