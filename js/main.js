import { supabase } from "./supabase.js";
const SESSION_KEY = "ef_user_session";

const APP_VERSION = "1.0.0";
const FERIA_TYPES = ["Feria Cientifica y Tecnologica", "Feria Expotecnica", "Festival Estudiantil de las Artes"];
const FESTIVAL_FERIA_NAME = "Festival Estudiantil de las Artes";
const FESTIVAL_CATEGORIES = ["Artes Visuales", "Artes Literarias", "Artes Digitales", "Artes Musicales", "Artes Escenicas"];
const FESTIVAL_SUBCATEGORIES = {
  "Artes Escenicas": [
    "COREOGRAFIA DE BAILE",
    "COREOGRAFIA CONCEPTUAL",
    "COREOGRAFIA DE PROYECCION FOLCLORICA COSTARRICENSE",
    "COREOGRAFIA FOLCLORICA INTERNACIONAL",
    "CUENTACUENTOS",
    "NARRACION O RELATO ORAL INDIGENA ORIGINAL",
    "NARRACION O RELATO INDIGENA DE TRADICION ANCESTRAL",
    "POESIA CORAL",
    "RETAHILA",
    "TEATRO DE MUNECOS O TITERES",
    "TEATRO DE NINOS Y NINAS",
    "TEATRO",
    "TEATRO DE NINOS Y NINAS INDIGENA",
    "TEATRO INDIGENA",
    "DANZA CULTURAL INDIGENA COSTARRICENSE",
    "DANZA CULTURAL INDIGENA INTERNACIONAL"
  ],
  "Artes Musicales": [
    "BANDA DE GARAJE",
    "CANCION ORIGINAL",
    "CANCION ORIGINAL DE NINOS Y NINAS",
    "CANCION POPULAR",
    "CANCION POPULAR DE NINOS Y NINAS",
    "CANCION TIPICA ORIGINAL COSTARRICENSE",
    "CANCION TIPICA POPULAR COSTARRICENSE",
    "CANTAUTOR/A",
    "CANTO INDIGENA ORIGINAL",
    "CANTO INDIGENA TRADICIONAL O ANCESTRAL",
    "CANTO INDIGENA ORIGINAL DE NINOS Y NINAS",
    "CANTO INDIGENA DE NINOS Y NINAS: TRADICIONAL O ANCESTRAL",
    "CIMARRONA",
    "CORO",
    "ENSAMBLE DE FLAUTAS DULCES",
    "ENSAMBLE INSTRUMENTAL CON MATERIALES RECICLABLES O REUTILIZABLES",
    "ESTUDIANTINA",
    "GRUPO INSTRUMENTAL EXPERIMENTAL",
    "GRUPO INSTRUMENTAL",
    "GRUPO MUSICAL CULTURAL INSTRUMENTAL INDIGENA",
    "GRUPO MUSICAL CULTURAL INDIGENA",
    "MARIMBA",
    "PERCUSION CORPORAL",
    "RAP"
  ],
  "Artes Digitales": [
    "ILUSTRACION DIGITAL",
    "MICRORRELATO ILUSTRADO DIGITAL",
    "MUSICA DIGITAL"
  ],
  "Artes Literarias": [
    "CANTO POETICO INDIGENA",
    "CUENTO",
    "CUENTO ILUSTRADO",
    "FOTONOVELA",
    "MICRORRELATO",
    "NOVELA GRAFICA",
    "POESIA",
    "POESIA INDIGENA"
  ],
  "Artes Visuales": [
    "COLLAGE",
    "DIBUJO",
    "DISENO DE OBJETO",
    "ESCULTURA",
    "ESCULTURAS VIVIENTES",
    "FOTOGRAFIA",
    "GRABADO",
    "MASCARA INDIGENA",
    "MASCARA O CARETA",
    "MASCARADA TRADICIONAL COSTARRICENSE",
    "MURAL",
    "PINTURA",
    "PINTURA CORPORAL",
    "PRODUCCION AUDIOVISUAL",
    "TENIDO TEXTIL",
    "DIBUJO INDIGENA",
    "ESCULTURA INDIGENA",
    "MURAL INDIGENA",
    "OBJETO CULTURAL INDIGENA",
    "PINTURA INDIGENA",
    "INSTALACION ARTISTICA"
  ]
};
const EXPOTECNICA_CATEGORIES = ["DESAFIO STEAM", "EMPRENDIMIENTO E INNOVACION"];
const PRONAFECYT_CATEGORIES = [
  "F8B - Demostraciones Científicas y Tecnológicas",
  "F9B - Investigación Científica",
  "F10B - I+D Tecnológico",
  "F11B - Quehacer Científico y Tecnológico",
  "F12B - Sumando Experiencias Científicas",
  "F13B - Mi Experiencia Científica"
];

const EXPOTECNICA_EJES = [
  "PRODUCCION AGRICOLA Y PECUARIA",
  "INDUSTRIA ALIMENTARIA",
  "ENERGIAS RENOVABLES",
  "INGENIERIA AMBIENTAL",
  "MECATRONICA",
  "TECNOLOGIAS DE LA INFORMACION APLICADAS A LA INFORMATICA",
  "INGENIERIA MECANICA",
  "INGENIERIA DE MATERIALES",
  "INDUSTRIA CREATIVA",
  "CONTABILIDAD, FINANZAS Y BANCA",
  "SERVICIOS SECRETARIALES",
  "HOSTELERIA Y SERVICIOS TURISTICOS",
  "GESTION DE SUMINISTROS",
  "MERCADEO",
  "SEGURIDAD Y PROTECCION LABORAL"
];

function showToast(message, type = "info") {
  const existing = document.querySelector(".toast-container");
  if (!existing) {
    const container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.querySelector(".toast-container").appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showSkeleton(container, rows = 4) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const div = document.createElement("div");
    div.className = "skeleton skeleton-row";
    container.appendChild(div);
  }
}

function showSkeletonCard(container) {
  if (!container) return;
  container.innerHTML = `<div class="skeleton skeleton-card"></div>`;
}



function normalizeRoleName(roleName) {
  const normalized = String(roleName ?? "").trim().toLowerCase();

  if (normalized === "juez") {
    return "Juez";
  }

  if (normalized === "admin" || normalized === "administrador") {
    return "administrador";
  }

  return String(roleName ?? "").trim();
}

function setMessage(target, text, kind = "info") {
  if (!target) {
    return;
  }

  target.textContent = text;
  target.dataset.kind = kind;
}

function isMissingColumnError(error, columnPrefix) {
  const message = String(error?.message ?? "").toLowerCase();
  const missingColumnSignals = [
    "does not exist",
    "could not find",
    "schema cache"
  ];

  return missingColumnSignals.some((signal) => message.includes(signal)) && message.includes(columnPrefix.toLowerCase());
}

function updateProjectFormFieldsByFeria(projectForm) {
  if (!projectForm) {
    return;
  }

  const feriaInput = projectForm.querySelector('[name="tipo_feria"]');
  const sections = projectForm.querySelectorAll("[data-feria-section]");
  const selectedFeria = String(feriaInput?.value ?? "");

  sections.forEach((section) => {
    const sectionFeria = String(section.dataset.feriaSection ?? "");
    const isActive = sectionFeria === selectedFeria;
    section.hidden = !isActive;
  });

  const isFestival = selectedFeria === FESTIVAL_FERIA_NAME;
  const isExpotecnica = selectedFeria === "Feria Expotecnica";

  const festivalCategorySelect = projectForm.querySelector('select[name="categoria_festival"]');
  const festivalSubcategorySelect = projectForm.querySelector('select[name="subcategoria_festival"]');
  const festivalCategoryValue = String(festivalCategorySelect?.value ?? "");
  const hasFestivalCategory = isFestival && FESTIVAL_CATEGORIES.includes(festivalCategoryValue);

  if (isFestival) {
    if (festivalSubcategorySelect) {
      const subcategories = FESTIVAL_SUBCATEGORIES[festivalCategoryValue] ?? [];
      const previousValue = String(festivalSubcategorySelect.value ?? "");

      festivalSubcategorySelect.innerHTML = [
        '<option value="">Selecciona una subcategoria</option>',
        ...subcategories.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
      ].join("");

      if (subcategories.includes(previousValue)) {
        festivalSubcategorySelect.value = previousValue;
      } else {
        festivalSubcategorySelect.value = "";
      }
    }

    const festivalSubcategoryWrap = projectForm.querySelector("[data-festival-subcategory-wrap]");
    if (festivalSubcategoryWrap) {
      festivalSubcategoryWrap.hidden = !hasFestivalCategory;
    }
    if (festivalCategorySelect) {
      festivalCategorySelect.required = true;
    }
    if (festivalSubcategorySelect) {
      festivalSubcategorySelect.required = hasFestivalCategory;
      if (!hasFestivalCategory) {
        festivalSubcategorySelect.value = "";
      }
    }
  } else {
    if (festivalCategorySelect) {
      festivalCategorySelect.required = false;
      festivalCategorySelect.value = "";
    }
    if (festivalSubcategorySelect) {
      festivalSubcategorySelect.required = false;
      festivalSubcategorySelect.value = "";
    }
  }

  const integrantesBlock = projectForm.querySelector("[data-integrantes-block]");
  if (integrantesBlock) {
    integrantesBlock.hidden = isFestival;
  }

  const expotecnicaCategorySelect = projectForm.querySelector('select[name="categoria_expotecnica"]');
  const expotecnicaEjeSelect = projectForm.querySelector('select[name="eje_tematico"]');
  const expoCategoryValue = String(expotecnicaCategorySelect?.value ?? "");
  const hasExpoCategory = isExpotecnica && EXPOTECNICA_CATEGORIES.includes(expoCategoryValue);

  if (isExpotecnica) {
    if (expotecnicaCategorySelect) {
      expotecnicaCategorySelect.required = true;
    }
    const expotecnicaEjeWrap = projectForm.querySelector("[data-expotecnica-eje-wrap]");
    if (expotecnicaEjeWrap) {
      expotecnicaEjeWrap.hidden = !hasExpoCategory;
    }
    if (expotecnicaEjeSelect) {
      expotecnicaEjeSelect.required = hasExpoCategory;
      if (!hasExpoCategory) {
        expotecnicaEjeSelect.value = "";
      }
    }
  } else {
    if (expotecnicaCategorySelect) {
      expotecnicaCategorySelect.required = false;
      expotecnicaCategorySelect.value = "";
    }
    if (expotecnicaEjeSelect) {
      expotecnicaEjeSelect.required = false;
      expotecnicaEjeSelect.value = "";
    }
  }

  const isScientific = selectedFeria === "Feria Cientifica y Tecnologica";
  const pronatecytSelect = projectForm.querySelector('select[name="categoria_pronatecyt"]');

  if (isScientific) {
    if (pronatecytSelect) pronatecytSelect.required = true;
  } else {
    if (pronatecytSelect) {
      pronatecytSelect.required = false;
      pronatecytSelect.value = "";
    }
  }
}

function fillSelect(select, items, placeholder, valueKey = "id", labelKey = "nombre") {
  if (!select) {
    return;
  }

  select.innerHTML = "";

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = placeholder;
  select.appendChild(firstOption);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = String(item[valueKey]);
    option.textContent = String(item[labelKey]);
    select.appendChild(option);
  });
}

function fillSelectGroupedByTipo(select, items, evaluatedKeys = new Set()) {
  if (!select) return;
  select.innerHTML = "";

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = evaluatedKeys.size
    ? `Selecciona un proyecto (${evaluatedKeys.size} evaluados)`
    : "Selecciona un proyecto asignado";
  select.appendChild(firstOption);

  const expo = items.filter((p) => (p.tipo_evaluacion ?? "Exposición") === "Exposición");
  const escrito = items.filter((p) => (p.tipo_evaluacion ?? "Exposición") === "Escrito");

  if (expo.length) {
    const group = document.createElement("optgroup");
    group.label = "Exposición";
    expo.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.id);
      const key = `${p.id}-${p.tipo_evaluacion ?? "Exposición"}`;
      const isEval = evaluatedKeys.has(key);
      opt.textContent = isEval ? "✓ " + String(p.titulo) : String(p.titulo);
      if (isEval) opt.dataset.evaluated = "true";
      group.appendChild(opt);
    });
    select.appendChild(group);
  }

  if (escrito.length) {
    const group = document.createElement("optgroup");
    group.label = "Escrito (Trabajo Escrito)";
    escrito.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.id);
      const key = `${p.id}-${p.tipo_evaluacion ?? "Exposición"}`;
      const isEval = evaluatedKeys.has(key);
      opt.textContent = isEval ? "✓ " + String(p.titulo) : String(p.titulo);
      if (isEval) opt.dataset.evaluated = "true";
      group.appendChild(opt);
    });
    select.appendChild(group);
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSession() {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function setupHamburgerMenu() {
  const hamburger = document.querySelector("[data-hamburger]");
  const header = document.querySelector("header");
  if (!hamburger || !header) return;

  hamburger.addEventListener("click", () => {
    header.classList.toggle("nav-open");
    document.body.classList.toggle("nav-open");
  });

  document.addEventListener("click", (e) => {
    if (!header.contains(e.target)) {
      header.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
    }
  });

  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
    });
  });
}

function setupHideOnScroll() {
  const header = document.querySelector("header");
  if (!header) return;
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 60) {
      header.classList.add("header-hidden");
    } else {
      header.classList.remove("header-hidden");
    }
    lastScroll = current;
  }, { passive: true });
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function bindLogout() {
  const link = document.querySelector("[data-logout-link]");

  if (!link) {
    return;
  }

  link.addEventListener("click", async (event) => {
    event.preventDefault();
    const user = getSession();

    if (user && normalizeRoleName(user.role) === "Juez") {
      showLogoutModal(user);
    } else {
      clearSession();
      window.location.href = "index.html";
    }
  });
}

let jspdfPromise = null;
function loadJSPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve();
  if (jspdfPromise) return jspdfPromise;
  jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => { if (window.jspdf?.jsPDF) resolve(); else reject(new Error("jsPDF not found after load")); };
    s.onerror = () => reject(new Error("Failed to load jspdf library"));
    document.head.appendChild(s);
  });
  return jspdfPromise;
}

let mepLogoPromise = null;
async function loadMEPLogo() {
  if (window._mepLogoData) return window._mepLogoData;
  if (mepLogoPromise) return mepLogoPromise;
  mepLogoPromise = (async () => {
    try {
      const resp = await fetch("img/descarga.png");
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const blob = await resp.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      window._mepLogoData = base64;
      return base64;
    } catch (e) {
      console.warn("No se pudo cargar el logo del MEP:", e);
      window._mepLogoData = null;
      return null;
    }
  })();
  return mepLogoPromise;
}

const PDF = {
  MARGIN: 15,
  PAGE_W: 210,
  PAGE_LIMIT: 275,
  PRIMARY: [0, 56, 101],
  GOLD: [204, 160, 59],
  GOLD_LIGHT: [255, 248, 231],
  INK: [30, 42, 58],
  MUTED: [100, 116, 139],
  BORDER: [203, 213, 225],
  ROW_ALT: [241, 245, 249],
  SUCCESS: [22, 163, 74],
  WARNING: [217, 119, 6],
  WHITE: [255, 255, 255],
};

function pdfHeader(doc, title, logoDataUrl) {
  let y = PDF.MARGIN + 8;
  doc.setDrawColor(...PDF.PRIMARY);
  doc.setFillColor(...PDF.PRIMARY);
  doc.roundedRect(PDF.MARGIN, y - 5, PDF.PAGE_W - 2 * PDF.MARGIN, 28, 2, 2, "F");

  const logoX = PDF.MARGIN + 3;
  const textX = PDF.MARGIN + 23;
  const headerTextY = y;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", logoX, headerTextY - 1, 18, 18);
    } catch (e) {
      console.warn("Error al añadir logo MEP:", e);
    }
  }

  doc.setTextColor(...PDF.WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ministerio de Educacion Publica", textX, headerTextY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Direccion Regional de Educacion Central del Pacifico", textX, headerTextY + 12);
  doc.text("Sistema de Evaluacion de Ferias Institucionales", textX, headerTextY + 17);

  y += 35;
  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.8);
  doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text(title, PDF.MARGIN, y);
  y += 10;
  return y;
}

function pdfFooter(doc, now) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const fy = doc.internal.pageSize.height - 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF.MUTED);
    doc.text(
      `Documento generado el ${now.toLocaleDateString("es-CR")} a las ${now.toLocaleTimeString("es-CR")} | Sistema de Evaluacion de Ferias`,
      PDF.MARGIN,
      fy
    );
    doc.text(`Pagina ${i} de ${pages}`, PDF.PAGE_W - PDF.MARGIN, fy, { align: "right" });
  }
}

function pdfInfoBox(doc, lines, y) {
  const boxW = PDF.PAGE_W - 2 * PDF.MARGIN;
  const boxH = lines.length * 7 + 8;
  doc.setDrawColor(...PDF.GOLD);
  doc.setFillColor(...PDF.GOLD_LIGHT);
  doc.roundedRect(PDF.MARGIN, y, boxW, boxH, 2.5, 2.5, "FD");
  doc.setTextColor(...PDF.PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  lines.forEach((line, i) => {
    doc.text(line, PDF.MARGIN + 5, y + 6 + i * 7);
  });
  return y + boxH + 10;
}

function pdfProjectHeader(doc, titulo, y) {
  doc.setFillColor(...PDF.PRIMARY);
  doc.setDrawColor(...PDF.PRIMARY);
  doc.roundedRect(PDF.MARGIN, y, PDF.PAGE_W - 2 * PDF.MARGIN, 8, 1.5, 1.5, "F");
  doc.setTextColor(...PDF.WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titulo, PDF.MARGIN + 3, y + 5.5);
  return y + 12;
}

function pdfColHeader(doc, labels, positions, y) {
  doc.setTextColor(...PDF.MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  labels.forEach((label, i) => doc.text(label, positions[i], y));
  y += 4;
  doc.setDrawColor(...PDF.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
  return y + 3;
}

function pdfCheckPage(doc, y, needed) {
  if (y > PDF.PAGE_LIMIT - (needed || 22)) {
    doc.addPage();
    return PDF.MARGIN;
  }
  return y;
}

function showLogoutModal(user) {
  const existing = document.getElementById("logout-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "logout-modal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-icon-wrap">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      </div>
      <h3 class="modal-title">Cerrar sesion</h3>
      <p class="modal-desc">Descarga tu reporte de evaluaciones antes de salir o cierra sesion directamente.</p>
      <div class="modal-actions">
        <button class="btn-modal btn-modal-pdf" id="modal-download-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
          Descargar PDF
        </button>
        <button class="btn-modal btn-modal-danger" id="modal-logout-btn">Salir sin descargar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById("modal-logout-btn").addEventListener("click", () => {
    overlay.remove();
    clearSession();
    window.location.href = "index.html";
  });

  document.getElementById("modal-download-btn").addEventListener("click", async () => {
    const btn = document.getElementById("modal-download-btn");
    btn.disabled = true;
    btn.textContent = "Verificando...";

    const { data: evalCheck } = await supabase
      .from("evaluaciones_proyectos")
      .select("id")
      .eq("juez_id", user.id)
      .limit(1);

    if (!evalCheck || evalCheck.length === 0) {
      showToast("No tienes evaluaciones guardadas para exportar. Cierra sesion sin descargar.", "info");
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg> Descargar PDF';
      return;
    }

    btn.textContent = "Generando PDF...";
    try {
      await generateJudgePDF(user);
    } catch (e) {
      console.error("Error generating PDF:", e);
      showToast("No se pudo generar el PDF. Revisa la conexion e intenta de nuevo.", "error");
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg> Descargar PDF';
      return;
    }
    overlay.remove();
    clearSession();
    window.location.href = "index.html";
  });
}



async function generateJudgePDF(user) {
  await loadJSPDF();
  const { data, error } = await supabase
    .from("evaluaciones_proyectos")
    .select("proyecto_id, criterio, nota, tipo_evaluacion, proyectos_ferias(titulo)")
    .eq("juez_id", user.id)
    .order("proyecto_id", { ascending: true });
  if (error) throw error;
  if (!data || !data.length) {
    showToast("No tienes evaluaciones guardadas para exportar.", "info");
    return;
  }

  // Group by project + tipo
  const grouped = new Map();
  data.forEach((item) => {
    const pid = Number(item.proyecto_id);
    const tipo = item.tipo_evaluacion ?? "Exposición";
    const key = `${pid}-${tipo}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        titulo: item.proyectos_ferias?.titulo || "Proyecto",
        tipo,
        items: [],
        total: 0
      });
    }
    const g = grouped.get(key);
    g.items.push({ criterio: item.criterio, nota: Number(item.nota || 0) });
    g.total += Number(item.nota || 0);
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const M = PDF.MARGIN;
  const W = PDF.PAGE_W;
  const colNotaX = M + 155;
  const colPctX = M + 140;
  let y = pdfHeader(doc, "Reporte de Evaluaciones del Juez");

  const infoLines = [
    `Juez: ${user.nombre}`,
    `Fecha: ${now.toLocaleDateString("es-CR")}`,
    `Hora: ${now.toLocaleTimeString("es-CR")}`,
    user.tipo_feria ? `Feria: ${user.tipo_feria}` : "",
    `Proyectos evaluados: ${grouped.size}`
  ].filter(Boolean);
  y = pdfInfoBox(doc, infoLines, y);

  // === Summary table ===
  y = pdfCheckPage(doc, y, 16 + grouped.size * 7);
  doc.setDrawColor(...PDF.PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text("RESUMEN", M, y);
  y += 5;

  // Summary header
  doc.setFillColor(...PDF.PRIMARY);
  doc.roundedRect(M, y - 1, W - 2 * M, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Proyecto", M + 2, y + 1.5);
  doc.text("Tipo", M + 75, y + 1.5);
  doc.text("Indicadores", colPctX, y + 1.5);
  doc.text("Puntaje", colNotaX, y + 1.5);
  y += 6;

  let grandTotal = 0;
  let rowIndex = 0;

  for (const [, g] of grouped) {
    y = pdfCheckPage(doc, y, 7);
    if (rowIndex % 2 === 1) {
      doc.setFillColor(...PDF.ROW_ALT);
      doc.rect(M, y - 2, W - 2 * M, 5.5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.INK);
    doc.text(g.titulo, M, y + 0.5);
    doc.setFont("helvetica", "bold");
    doc.text(g.tipo === "Escrito" ? "Escrito" : "Expo", M + 75, y + 0.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(g.items.length), colPctX, y + 0.5);
    doc.text(String(g.total), colNotaX, y + 0.5);
    y += 5.5;
    grandTotal += g.total;
    rowIndex++;
  }

  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text("TOTAL GENERAL", M, y);
  doc.text(`${grandTotal} puntos`, colNotaX, y);
  y += 8;

  // === Details per project ===
  y = pdfSubHeader(doc, "Detalle por proyecto", y);

  rowIndex = 0;

  for (const [, g] of grouped) {
    y = pdfCheckPage(doc, y, 22 + g.items.length * 6);
    const headerLabel = `${g.titulo} [${g.tipo === "Escrito" ? "Escrito" : "Exposición"}]`;
    y = pdfProjectHeader(doc, headerLabel, y);

    y = pdfColHeader(doc, ["Criterio de evaluacion", "Nota"], [M, colNotaX], y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF.INK);
    doc.setFontSize(8);
    for (const item of g.items) {
      y = pdfCheckPage(doc, y, 6);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...PDF.ROW_ALT);
        doc.rect(M, y - 3, W - 2 * M, 6, "F");
      }
      doc.text(item.criterio, M, y);
      doc.text(String(item.nota), colNotaX, y, { align: "right" });
      y += 6;
      rowIndex++;
    }

    y += 1;
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 2.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF.PRIMARY);
    const maxPossible = g.items.length * 3;
    doc.text(`Total: ${g.total} / ${maxPossible} puntos (${Math.round(g.total / maxPossible * 100)}%)`, M, y);
    doc.setFontSize(7);
    doc.setTextColor(...PDF.MUTED);
    doc.text(`${g.items.length} criterio${g.items.length !== 1 ? "s" : ""}`, colNotaX, y, { align: "right" });
    y += 9;
  }

  y += 3;
  y = pdfCheckPage(doc, y, 18);
  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 6;
  doc.setFillColor(...PDF.GOLD_LIGHT);
  doc.roundedRect(M, y - 3, W - 2 * M, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text("PUNTAJE TOTAL GENERAL", M + 4, y + 4);
  doc.text(`${grandTotal} puntos`, W - M - 4, y + 4, { align: "right" });

  pdfFooter(doc, now);
  doc.save(`evaluaciones_${user.nombre.replace(/\s+/g, "_")}.pdf`);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

async function passwordMatches(inputPassword, storedPassword) {
  const normalizedStoredPassword = String(storedPassword ?? "").trim();

  if (inputPassword === normalizedStoredPassword || inputPassword.trim() === normalizedStoredPassword) {
    return true;
  }

  try {
    const hashedInputPassword = await hashPassword(inputPassword);
    return hashedInputPassword === normalizedStoredPassword;
  } catch {
    return false;
  }
}

async function loadProjects(feriaType = "") {
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

async function loadJudges(feriaType = "") {
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

async function loadJudgeAssignments() {
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

async function loadAssignedProjectsForJudge(judgeId) {
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

async function loadUsers() {
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

function filterByFeria(items, feriaType) {
  if (!feriaType) {
    return items;
  }

  return (items ?? []).filter((item) => String(item.tipo_feria ?? "") === feriaType);
}

async function loadUserForLogin(username) {
  const tryWithFeria = await supabase
    .from("usuarios")
    .select("id, nombre, contrasena_hash, role_id, tipo_feria")
    .ilike("nombre", username)
    .maybeSingle();

  if (!tryWithFeria.error) {
    return tryWithFeria;
  }

  if (!isMissingColumnError(tryWithFeria.error, "tipo_feria")) {
    return tryWithFeria;
  }

  const fallback = await supabase
    .from("usuarios")
    .select("id, nombre, contrasena_hash, role_id")
    .ilike("nombre", username)
    .maybeSingle();

  if (fallback.data) {
    return {
      data: {
        ...fallback.data,
        tipo_feria: null
      },
      error: fallback.error
    };
  }

  return fallback;
}

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
            <button class="table-action-btn edit-project-btn" data-edit-project='${escapeHTML(JSON.stringify(item))}'>Editar</button>
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

function getRubricIndicatorsByFeria(feriaType) {
  if (feriaType === "Feria Expotecnica") {
    return [
      "Planteamiento y justificacion del proyecto",
      "Metodologia aplicada",
      "Calidad tecnica y funcionalidad",
      "Presentacion y comunicacion",
      "Viabilidad e impacto"
    ];
  }

  if (feriaType === "Festival Estudiantil de las Artes") {
    return [
      "Creatividad e originalidad",
      "Calidad artistica y tecnica",
      "Expresion y comunicacion",
      "Puesta en escena y presentacion"
    ];
  }

  return [
    "Dominio del tema cientifico",
    "Metodologia e investigacion",
    "Innovacion del proyecto",
    "Presentacion y comunicacion"
  ];
}

function getExpotecnicaRubricByCategory(category, tipo) {
  const EXPO_RUBRICS = {
    "DESAFIO STEAM": {
      title: "ExpoTEC-7 - Exposicion del proyecto Desafio STEAM",
      sections: [
        {
          title: "A. Identificacion y formulacion del problema",
          indicators: [
            "Define el problema de forma precisa.",
            "Plantea alternativas de solucion con conceptos teorico-practicos atinentes.",
            "Propone objetivos vinculados a la busqueda de soluciones.",
            "Evidencia el impacto social, cientifico o tecnologico a corto y largo plazo.",
            "Demuestra capacidad para expresar ideas con seguridad y defender el proyecto."
          ]
        },
        {
          title: "B. Elaboracion del proyecto y metodologia",
          indicators: [
            "Demuestra una linea de investigacion y desarrollo coherente y clara.",
            "Argumenta el analisis e interpretacion de datos recopilados.",
            "Evidencia gestion de recursos y busqueda de apoyo.",
            "Demuestra originalidad y autoria propia.",
            "Aplica la normativa vigente.",
            "Se evidencia la factibilidad e implementacion comercial o industrial a futuro."
          ]
        },
        {
          title: "C. Prototipo y resultados",
          indicators: [
            "Presenta una linea de trabajo coherente y clara.",
            "Da respuesta a la necesidad u objetivos planteados.",
            "Evidencia uso optimo de los recursos disponibles.",
            "Demuestra precision tecnica en elaboracion y funcionamiento.",
            "Respeta las normativas de seguridad vigentes.",
            "Muestra actualidad tecnologica en el campo de trabajo.",
            "Evidencia el funcionamiento correcto segun la solucion planteada.",
            "Demuestra creatividad e innovacion en ideas nuevas o mejoradas."
          ]
        },
        {
          title: "D. Presentacion y comunicacion",
          indicators: [
            "Evidencia apropiacion y dominio del tema.",
            "Demuestra claridad y coherencia en la exposicion ante el panel de jueces.",
            "Utiliza lenguaje tecnico acorde con el nivel academico y el campo.",
            "Argumenta de forma solida y fundamentada la propuesta.",
            "Emplea recursos afines (disenos, diagramas, graficos, esquemas, modelos, programas, equipos).",
            "Describe la metodologia para implementacion, evaluacion y perfeccionamiento de la solucion.",
            "Presenta resultados consistentes con los objetivos y la solucion al problema.",
            "Brinda conclusiones precisas y objetivas basadas en los resultados.",
            "Denota colaboracion y comunicacion efectiva del equipo.",
            "Demuestra capacidad de recibir, analizar y aplicar sugerencias de mejora."
          ]
        },
        {
          title: "E. Documentacion del proyecto",
          indicators: [
            "Se evidencia congruencia entre lo expuesto por el estudiante o equipo y el informe escrito.",
            "Evidencia el uso de lenguaje tecnico afin al tema del proyecto.",
            "Estipula los procedimientos tecnicos utilizados.",
            "La bitacora detalla en forma cronologica los procesos de investigacion, implementacion y experimentacion.",
            "El cartel contiene informacion relevante para la exposicion del proyecto.",
            "Utiliza el cartel como recurso y apoyo para el desarrollo de la exposicion."
          ]
        }
      ]
    },
    "EMPRENDIMIENTO E INNOVACION": {
      title: "ExpoTEC-8 - Evaluacion de la exposicion del modelo de negocios",
      sections: [
        {
          title: "A. Propuesta de valor y ventaja competitiva",
          indicators: [
            "Define de forma precisa la operacion basica de la potencial empresa.",
            "Plantea las alternativas de solucion que la empresa brindara al problema o necesidad detectada.",
            "Describe los productos o servicios ofrecidos que brindan valor a los clientes.",
            "Evidencia el impacto de la potencial empresa desde diversos ambitos, tanto a corto como a largo plazo.",
            "Argumenta las diferencias que ofrece la potencial empresa con la competencia."
          ]
        },
        {
          title: "B. Conocimiento del mercado y modelo de negocio",
          indicators: [
            "Demuestra un buen entendimiento del mercado, la competencia y aspectos financieros.",
            "Argumenta con solidez que hace unico al negocio y por que constituye una buena oportunidad.",
            "Demuestra gestion de los recursos de forma sostenible y responsable.",
            "Expone una propuesta innovadora y creativa con respecto al mercado.",
            "Define los canales mediante los cuales hara llegar a los clientes la propuesta de valor.",
            "Caracteriza el segmento de clientes (necesidades, comportamientos, atributos)."
          ]
        },
        {
          title: "C. Comunicacion y presentacion oral",
          indicators: [
            "Demuestra claridad y coherencia en la exposicion del modelo de negocios ante el panel de jueces.",
            "Utiliza lenguaje tecnico acorde con el nivel academico y el campo del negocio.",
            "Evidencia capacidad de comunicacion oral y dominio de la propuesta de valor."
          ]
        },
        {
          title: "D. Operaciones y sostenibilidad del negocio",
          indicators: [
            "Expone las fuentes de ingresos y estructura de costos.",
            "Describe las demandas del segmento de clientes y el seguimiento para asegurar la calidad de los bienes o servicios ofrecidos.",
            "Describe las alianzas estrategicas de su propuesta de valor."
          ]
        }
      ]
    }
  };

  const ESCRITO_RUBRICS = {
    "DESAFIO STEAM": {
      title: "ExpoTEC-10 - Evaluacion del informe escrito y bitacora (Desafio STEAM)",
      sections: [
        {
          title: "I. Introduccion",
          indicators: [
            "Delimita los antecedentes del problema o necesidad por solventar.",
            "Evidencia claridad en la definicion del problema.",
            "Fundamenta la relevancia o utilidad potencial del proyecto.",
            "Define los criterios tecnicos utilizados para la solucion del problema.",
            "Evidencia la viabilidad del proyecto."
          ]
        },
        {
          title: "II. Marco teorico",
          indicators: [
            "Emplea variedad de fuentes de informacion confiables para sustentar el proyecto (tesis, libros, articulos, entrevistas, repositorios, paginas web).",
            "Incluye citas bibliograficas relevantes, de forma critica dentro del texto, que documentan la investigacion y desarrollo del proyecto.",
            "Emplea fuentes bibliograficas actualizadas, segun el tema abordado en el proyecto.",
            "Define terminos o conceptos relevantes para la investigacion y desarrollo del proyecto.",
            "Sintetiza la informacion existente del tema en estudio.",
            "Evidencia la organizacion logica de la informacion recopilada."
          ]
        },
        {
          title: "III. Objetivos",
          indicators: [
            "Presenta el objetivo general y al menos dos objetivos especificos.",
            "Se plantean de forma clara, precisa y segun estructura requerida: verbo en infinitivo, contenido y condicion tecnica.",
            "Evidencia relacion con la propuesta de solucion planteada."
          ]
        },
        {
          title: "IV. Metodologia",
          indicators: [
            "Presenta las etapas del proyecto en el cronograma.",
            "Cumple con las etapas establecidas en el cronograma.",
            "Describe paso a paso los procedimientos y tecnicas utilizadas para la investigacion y desarrollo.",
            "Describe los recursos utilizados para la implementacion del proyecto.",
            "Evidencia procesos de mejora continua durante la investigacion y desarrollo del proyecto.",
            "Evidencia el desarrollo de ideas novedosas o la aplicacion creativa de conocimientos.",
            "Fundamenta los calculos requeridos para las demostraciones.",
            "Incluye disenos y esquemas claros en relacion con el desarrollo del prototipo."
          ]
        },
        {
          title: "V. Discusion de resultados y conclusiones",
          indicators: [
            "Muestra concordancia entre los resultados obtenidos y los objetivos planteados.",
            "Presenta los datos mediante tablas, diagramas, figuras, graficos, entre otros, que sustenten los resultados obtenidos.",
            "Evidencia la interpretacion de los resultados desde una vision analitica y reflexiva, sin delimitarse a describirlos.",
            "Demuestra resultados (producto) aplicables y utiles en la vida real.",
            "Presenta coherencia entre los disenos y esquemas con respecto al prototipo desarrollado.",
            "Plantea conclusiones relevantes en relacion con los objetivos trazados, analisis de datos y prototipado.",
            "Concluye sobre el impacto ambiental, social o economico de la implementacion del proyecto."
          ]
        },
        {
          title: "VI. Estructura y formato del proyecto",
          indicators: [
            "Presenta una organizacion clara y logica, en congruencia con la estructura dada en los lineamientos.",
            "Presenta el documento en formato de doble columna (IEEE, articulo de revista).",
            "Presenta el listado de referencias citadas en el documento, segun formato APA vigente."
          ]
        },
        {
          title: "VII. Bitacora",
          indicators: [
            "Evidencia el proceso de investigacion y desarrollo realizado.",
            "Cumple con el formato solicitado, segun los lineamientos de la ExpoTECNICA.",
            "Presenta relacion con el informe escrito."
          ]
        }
      ]
    },
    "EMPRENDIMIENTO E INNOVACION": {
      title: "ExpoTEC-11 - Evaluacion del documento escrito del modelo de negocios",
      sections: [
        {
          title: "A. Propuesta de valor y diferenciacion",
          indicators: [
            "Describe de forma clara y precisa los antecedentes que fundamentan la propuesta de valor.",
            "Explica con solidez que hace unico al negocio y por que es atractivo.",
            "Describe las actividades clave que la empresa implementa para ofrecer una propuesta de valor.",
            "Describe de forma detallada el producto o servicio propuesto que brinda valor a los clientes.",
            "Detalla como los productos o servicios ofrecidos se diferencian de la competencia."
          ]
        },
        {
          title: "B. Segmento de clientes y canales",
          indicators: [
            "Emplea lenguaje tecnico acorde con el nivel academico y el campo del negocio.",
            "Define los canales mediante los cuales hara llegar a los clientes la propuesta de valor.",
            "Caracteriza ampliamente el segmento de clientes (necesidades, comportamientos, atributos).",
            "Presenta los elementos diferenciadores que facilitan la decision de compra del cliente.",
            "Describe las demandas del segmento de clientes y el seguimiento para asegurar la calidad de los bienes o servicios ofrecidos.",
            "Presenta las estrategias para el acercamiento al cliente, ya sea durante el proceso de atencion o de servicio."
          ]
        },
        {
          title: "C. Estructura financiera y alianzas",
          indicators: [
            "Presenta datos sobre clientes, tendencias y oportunidades.",
            "Incluye estrategias de promocion, precios, distribucion y posicionamiento.",
            "Presenta la estructura de costos, gastos e ingresos.",
            "Incluye los canales para la distribucion del producto hasta el cliente y su promocion, incorporando el uso de nuevas tecnologias.",
            "Detalla las alianzas estrategicas y aportes a su propuesta de valor."
          ]
        },
        {
          title: "D. Viabilidad y pertinencia del negocio",
          indicators: [
            "Justifica de forma solida la viabilidad y pertinencia del negocio.",
            "Identifica la situacion de mercado, sociedad o industria que se aborda en la propuesta de negocio.",
            "Argumenta la necesidad o problema que resuelve la propuesta de negocio.",
            "Determina aspectos sociales, economicos, tecnologicos o ambientales que resuelve la propuesta de negocio."
          ]
        },
        {
          title: "E. Estructura y formato del documento",
          indicators: [
            "Plantea los objetivos del negocio enfatizando en su viabilidad, escalabilidad y sostenibilidad.",
            "Presenta una organizacion clara y logica del documento, en congruencia con la estructura dada en los lineamientos.",
            "Presenta el listado de referencias citadas en el documento, segun formato APA vigente.",
            "Cumple con el formato establecido."
          ]
        }
      ]
    }
  };

  if (tipo === "Escrito" && ESCRITO_RUBRICS[category]) {
    return {
      title: ESCRITO_RUBRICS[category].title,
      sections: ESCRITO_RUBRICS[category].sections
    };
  }

  if (EXPO_RUBRICS[category]) {
    return {
      title: EXPO_RUBRICS[category].title,
      sections: EXPO_RUBRICS[category].sections
    };
  }

  return {
    title: "Evaluacion general - ExpoTECNICA",
    sections: [{ title: "Criterios generales", indicators: getRubricIndicatorsByFeria("Feria Expotecnica") }]
  };
}

function getPronatecytRubricByCategory(category) {
  const F8B = {
    title: "PRONAFECYT F8B - Demostraciones Científicas y Tecnológicas (40 pts)",
    sections: [
      {
        title: "A. Propósito principal de la demostración e importancia del tema",
        indicators: [
          "El propósito es explicado con claridad y coherencia, así como la importancia de la investigación y sus posibles consecuencias.",
          "Las preguntas generales están relacionadas con la demostración.",
          "La demostración corresponde a un proceso o principio científico o tecnológico."
        ]
      },
      {
        title: "B. Marco teórico y metodología",
        indicators: [
          "Existe familiaridad y manejo de los contenidos de las fuentes consultadas.",
          "Existe claridad en los conceptos utilizados.",
          "La organización de la investigación demuestra una metodología de trabajo.",
          "Selecciona los instrumentos adecuados para su demostración (maquetas, modelos, equipo de laboratorio, etc.).",
          "Utiliza recursos materiales en forma ingeniosa y creativa.",
          "Los recursos y desechos generados son utilizados considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "C. Análisis y conclusiones (Logros obtenidos)",
        indicators: [
          "Realiza la interpretación de los resultados obtenidos en la demostración.",
          "Explica cómo la demostración ilustra el concepto o principio científico, tecnológico o social seleccionado.",
          "Contrasta o compara los resultados obtenidos en la demostración, con la información consultada.",
          "Complementa la comparación con reflexiones personales."
        ]
      },
      {
        title: "D. Dominio del principio o proceso científico o tecnológico",
        indicators: [
          "Explica el principio, proceso científico o tecnológico.",
          "Evidencia comprensión de los conceptos que fundamentan la demostración.",
          "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
        ]
      },
      {
        title: "E. Presentación y comunicación científica o tecnológica",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Existe claridad en la comunicación y se utiliza lenguaje científico acorde al tema.",
          "Existe capacidad de síntesis para realizar la comunicación."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
          "Existe originalidad en la elaboración del material."
        ]
      }
    ]
  };

  const F9B = {
    title: "PRONAFECYT F9B - Investigación Científica (40 pts)",
    sections: [
      {
        title: "A. Planteamiento de los objetivos y justificación del problema",
        indicators: [
          "La escogencia del problema demuestra creatividad y originalidad.",
          "Los objetivos tienen relación con el problema de investigación.",
          "Los objetivos son explicados con claridad y coherencia, así como la importancia de la investigación.",
          "La definición de la pregunta incluye las variables.",
          "Las personas estudiantes identifican las variables en la hipótesis."
        ]
      },
      {
        title: "B. Marco teórico",
        indicators: [
          "Existe familiaridad y manejo de los contenidos de las fuentes.",
          "Es comprensible el manejo de los conceptos, variables o términos técnicos utilizados."
        ]
      },
      {
        title: "C. Metodología aplicada",
        indicators: [
          "Planificación y cumplimiento por etapas de la investigación.",
          "Selecciona recursos e instrumentos adecuados para utilizarlos.",
          "Describe los recursos tecnológicos (digitales o analógicos) y/o material concreto, preferiblemente reutilizable, requeridos en el desarrollo de la investigación.",
          "Describe de manera adecuada las metodologías utilizadas.",
          "Los recursos y desechos generados son utilizados considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "D. Discusión, interpretación y aplicación de los resultados",
        indicators: [
          "Existe coherencia entre los objetivos y las conclusiones.",
          "Análisis, discusión y correlación de variables es adecuado.",
          "Logra la comprobación o negación de las hipótesis según las variables.",
          "Congruencia de datos, tablas y gráficos presentados con el tema escogido.",
          "Sugiere posibles aplicaciones de los resultados obtenidos o mejoras a las actividades efectuadas."
        ]
      },
      {
        title: "E. Presentación y comunicación científica",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Capacidad de síntesis para llevar a cabo la comunicación.",
          "Claridad y coherencia al explicar el propósito, el proceso de investigación y sus conclusiones.",
          "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
          "Existe originalidad en la elaboración del material."
        ]
      }
    ]
  };

  const F10B = {
    title: "PRONAFECYT F10B - I+D Tecnológico (40 pts)",
    sections: [
      {
        title: "A. Planteamiento de los objetivos y justificación del problema",
        indicators: [
          "La escogencia del problema/pregunta responde a una necesidad concreta.",
          "Justifica, de forma cualitativa o cuantitativa, la relevancia del problema y la necesidad a abordar con la investigación.",
          "Los objetivos tienen relación con el problema de investigación.",
          "Los objetivos son explicados con claridad y coherencia, así como la importancia de la investigación y sus posibles consecuencias."
        ]
      },
      {
        title: "B. Marco teórico",
        indicators: [
          "Existe familiaridad y manejo de los contenidos de las fuentes.",
          "Existe claridad y precisión en los conceptos utilizados.",
          "Utiliza correctamente el lenguaje científico y tecnológico acorde a la investigación."
        ]
      },
      {
        title: "C. Metodología aplicada",
        indicators: [
          "Selección de instrumentos y métodos adecuados.",
          "Describe las metodologías utilizadas para la obtención de soluciones tecnológicas.",
          "Cumplimiento de las etapas planificadas en el diseño del desarrollo tecnológico.",
          "Utiliza recursos materiales de bajo costo.",
          "Los recursos están orientados hacia la sostenibilidad ambiental.",
          "Describe las metodologías de evaluación y perfeccionamiento."
        ]
      },
      {
        title: "D. Discusión, interpretación y aplicación de los resultados",
        indicators: [
          "Coherencia de los objetivos con los resultados obtenidos.",
          "Explica cómo los resultados de la investigación tienen un impacto positivo sobre el problema a resolver.",
          "Presentación y congruencia de datos, tablas y gráficos con el tema investigado.",
          "Analiza posibles aplicaciones del desarrollo tecnológico obtenido en la sociedad."
        ]
      },
      {
        title: "E. Presentación y comunicación científica",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Existe capacidad de síntesis para llevar a cabo la comunicación.",
          "Claridad al explicar el propósito, el proceso de investigación y la relevancia del trabajo a través de sus conclusiones.",
          "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
          "Existe originalidad en la elaboración del material."
        ]
      }
    ]
  };

  const F11B = {
    title: "PRONAFECYT F11B - Quehacer Científico y Tecnológico I y II Ciclos (40 pts)",
    sections: [
      {
        title: "A. Aspectos iniciales",
        indicators: [
          "Las ideas previas que motivan la investigación evidencian una toma de decisiones por parte de las personas estudiantes.",
          "Expresa sus ideas al presentar la(s) pregunta(s) que orienta su investigación y las suposiciones o predicciones."
        ]
      },
      {
        title: "B. Pasos por seguir",
        indicators: [
          "Las acciones o pasos realizados en la investigación son comunicados con frases sencillas y coherentes.",
          "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
        ]
      },
      {
        title: "C. Logros obtenidos",
        indicators: [
          "Comunica los logros de la investigación.",
          "Comunica las fuentes de información consultadas.",
          "Expresa ideas propias relacionadas con la temática investigada.",
          "Evidencia el disfrute y apropiación de la investigación realizada."
        ]
      },
      {
        title: "D. Dominio de la temática",
        indicators: [
          "Comunica el proceso de la investigación realizada de forma lógica y secuencial.",
          "Demuestra dominio al comunicar los logros obtenidos.",
          "Todas las personas estudiantes integrantes del proyecto participan en la comunicación de la información."
        ]
      },
      {
        title: "E. Presentación y comunicación de la información",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Menciona todos los elementos que apoyan el trabajo de investigación.",
          "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
          "Existe originalidad en la elaboración del material."
        ]
      }
    ]
  };

  const F12B = {
    title: "PRONAFECYT F12B - Sumando Experiencias Científicas (40 pts)",
    sections: [
      {
        title: "A. Aspectos iniciales",
        indicators: [
          "Las ideas previas que motivan la investigación evidencian una toma de decisiones por parte de las personas estudiantes.",
          "Expresa sus ideas al presentar la(s) pregunta(s) que orienta su investigación y las suposiciones o predicciones."
        ]
      },
      {
        title: "B. Pasos por seguir",
        indicators: [
          "Las acciones o pasos realizados en la investigación son comunicados con frases sencillas y coherentes.",
          "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
        ]
      },
      {
        title: "C. Logros obtenidos",
        indicators: [
          "Comunica los hallazgos con la información consultada.",
          "Comunica los logros de la investigación.",
          "Comunica las fuentes de información consultadas.",
          "Expresa ideas propias relacionadas con la temática investigada.",
          "Evidencia el disfrute y apropiación de la investigación realizada."
        ]
      },
      {
        title: "D. Dominio de la temática",
        indicators: [
          "Comunica el proceso de la investigación realizada de forma lógica y secuencial.",
          "Demuestra dominio al comunicar los logros obtenidos.",
          "Todas las personas estudiantes integrantes del proyecto participan en la comunicación de la información."
        ]
      },
      {
        title: "E. Presentación y comunicación de la información",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Señala o menciona todos los elementos que apoyan el trabajo de investigación.",
          "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y otros recursos visuales corresponden al desarrollo cognitivo de las personas estudiantes.",
          "Existe originalidad en la elaboración del material."
        ]
      }
    ]
  };

  const F13B = {
    title: "PRONAFECYT F13B - Mi Experiencia Científica (100 pts)",
    sections: [
      {
        title: "A. Aspectos iniciales",
        indicators: [
          "Se evidencia el planteamiento de la hipótesis o problema.",
          "Se demuestra que fue un tema desarrollado en el aula.",
          "Es un tema que corresponde al currículo establecido al nivel de los estudiantes."
        ]
      },
      {
        title: "B. Pasos por seguir",
        indicators: [
          "Expresa de acuerdo a sus habilidades comunicativas las acciones o pasos realizados en la investigación (material concreto, fotos, pictograma, señas, oral).",
          "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
        ]
      },
      {
        title: "C. Logros obtenidos",
        indicators: [
          "Expresa de acuerdo a sus habilidades comunicativas los hallazgos con la información consultada (material concreto, fotos, pictograma, señas, oral).",
          "Expresa de acuerdo a sus habilidades comunicativas los logros de la investigación (material concreto, fotos, pictograma, señas, oral).",
          "Expresa de acuerdo a sus habilidades comunicativas las fuentes de información consultada (material concreto, fotos, pictograma, señas, oral).",
          "Evidencia el disfrute y la apropiación de la investigación realizada."
        ]
      },
      {
        title: "D. Dominio de la temática",
        indicators: [
          "Expresa de acuerdo a sus habilidades comunicativas el proceso de la investigación realizada de forma lógica y secuencial (material concreto, fotos, pictograma, señas, oral).",
          "Demuestra dominio al comunicar los logros obtenidos.",
          "Todas las personas integrantes del proyecto participan en la comunicación del proyecto."
        ]
      },
      {
        title: "E. Comunicación de la información",
        indicators: [
          "El cartel presentado apoya la comunicación en forma fluida.",
          "El material expuesto tiene relación con el trabajo de investigación.",
          "Señala o menciona todos los elementos que apoyan el trabajo de investigación.",
          "Manifiesta normas de cortesía al comunicar lo investigado."
        ]
      },
      {
        title: "F. Autenticidad del trabajo realizado",
        indicators: [
          "El cartel y otros recursos (objetos concretos, imágenes, material audiovisual, recursos tecnológicos y otros) corresponden al desarrollo cognitivo de los estudiantes.",
          "Evidencia originalidad en la elaboración de material."
        ]
      }
    ]
  };

  const F8C = {
    title: "PRONAFECYT F8C - Demostraciones Científicas y Tecnológicas (Diario de Experiencias)",
    sections: [
      {
        title: "Portada e Índice",
        indicators: [
          "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
          "El título del proyecto establece una idea general del trabajo realizado.",
          "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
        ]
      },
      {
        title: "Aspectos iniciales de la demostración (Introducción)",
        indicators: [
          "Anota las ideas previas que motivan la realización del proyecto.",
          "Señala la importancia del tema relacionado con la demostración.",
          "Indica la(s) pregunta(s) general(es) relacionadas con la demostración.",
          "Explica el propósito principal de la demostración del campo científico, tecnológico o social seleccionado."
        ]
      },
      {
        title: "Explorando fuentes de información (Marco teórico)",
        indicators: [
          "Describe las palabras claves, los conceptos o términos técnicos relevantes que se ponen en práctica en la demostración, indicando las fuentes de información consultadas.",
          "Registra información adicional de diferentes fuentes de carácter científico, empírico o cotidiano, que complementan las ideas previas planteadas.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
        ]
      },
      {
        title: "Pasos por seguir (Metodología)",
        indicators: [
          "Explica los pasos, procedimientos, métodos o técnicas utilizados en la demostración.",
          "Narra los aportes propios que enriquecen la demostración realizada.",
          "Indica si la demostración presenta algún cambio a partir de la fuente original de donde fue tomada.",
          "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o el material concreto preferiblemente reutilizable, requeridos en el desarrollo de la demostración.",
          "Describe los recursos utilizados y el manejo de los residuos que pueden generarse considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "Logros obtenidos (Interpretación de los resultados)",
        indicators: [
          "Analiza o interpreta los resultados obtenidos en la demostración.",
          "Contrasta los resultados obtenidos con la información consultada, anotando reflexiones personales, acordes a su edad.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
          "Establece las conclusiones obtenidas a partir de la demostración realizada.",
          "Aporta evidencias (fotografías, listas de asistencia, afiches, entre otras) acerca de la comunicación de la información obtenida en la demostración a los miembros de la comunidad educativa."
        ]
      },
      {
        title: "Referencias consultadas y Resumen",
        indicators: [
          "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
          "Aporta referencias de no más de 10 años y de fuentes confiables, tomando en cuenta la abundancia de información sobre el tema desarrollado.",
          "Utiliza un formato de referencia bibliográfica consistente sea APA u otro. Cita todas las fuentes que fueron mencionadas como referencias en el trabajo y viceversa.",
          "Presenta una síntesis de los aspectos más relevantes de la demostración, describiendo en qué consiste, los resultados obtenidos, las conclusiones o las recomendaciones derivadas del trabajo realizado (máximo 250 palabras)."
        ]
      }
    ]
  };

  const F9C = {
    title: "PRONAFECYT F9C - Investigación Científica (Diario de Experiencias)",
    sections: [
      {
        title: "Portada e Índice",
        indicators: [
          "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
          "El título del proyecto establece una idea general del trabajo realizado.",
          "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
        ]
      },
      {
        title: "Aspectos iniciales de la investigación (Introducción)",
        indicators: [
          "Anota las ideas previas que motivan la realización del proyecto.",
          "Indica la importancia del tema investigado.",
          "Presenta la(s) pregunta(s) que orientan la investigación.",
          "Redacta la(s) hipótesis que se desea comprobar, tomando en cuenta las variables, independiente y dependiente.",
          "Presenta el objetivo general y de uno a tres objetivos específicos de la investigación."
        ]
      },
      {
        title: "Explorando fuentes de información (Marco teórico)",
        indicators: [
          "Describe los conceptos, las variables o términos técnicos relevantes que se aplican en la investigación, indicando las fuentes de información consultadas.",
          "Registra información adicional de diferentes fuentes de carácter científico, empírico o cotidiano, que complementan las ideas previas planteadas.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
        ]
      },
      {
        title: "Pasos por seguir (Metodología)",
        indicators: [
          "Explica los pasos, procedimientos, métodos o técnicas utilizados en la investigación.",
          "Presenta la lista de recursos tecnológicos (digitales o analógicos) y/o el material concreto preferiblemente reutilizable, requeridos en el desarrollo de la investigación.",
          "Selecciona y describe los instrumentos adecuados de investigación (encuestas, entrevistas, hojas de observación, experimentos, grupo control, entre otros).",
          "Explica las variables independiente y dependiente, que forman parte de la hipótesis que se desea comprobar.",
          "Describe los recursos utilizados y el manejo de los residuos que pueden generarse, considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "Logros obtenidos (Interpretación de los resultados)",
        indicators: [
          "Analiza de forma estadística los datos obtenidos acerca de las variables establecidas en la hipótesis, por medio de tablas, gráficos, promedios, entre otros.",
          "Indica si se cumple o no la hipótesis planteada.",
          "Contrasta o compara los resultados obtenidos con la información consultada, complementándola con reflexiones personales.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
          "Establece al menos una conclusión por cada objetivo específico planteado.",
          "Brinda sugerencias para mejorar las actividades efectuadas, tomando en cuenta la(s) pregunta(s) de la investigación.",
          "Aporta evidencias (fotografías, listas de asistencia, afiches, entre otras) acerca de la comunicación de los logros obtenidos en la investigación."
        ]
      },
      {
        title: "Referencias consultadas, Resumen y Bitácora",
        indicators: [
          "Presenta suficientes referencias que sustentan el trabajo (mínimo siete fuentes para III Ciclo y Educación Diversificada).",
          "Aporta referencias de no más de 10 años y de fuentes confiables.",
          "Utiliza un formato de referencia bibliográfica consistente sea APA u otro.",
          "Contiene una síntesis de los aspectos más relevantes de la investigación (metodología, resultados, conclusiones, máximo 250 palabras).",
          "Se presenta completa la bitácora, dando cuenta de las diferentes actividades de investigación realizadas (fecha, hora, actividad, resumen, temas discutidos)."
        ]
      }
    ]
  };

  const F10C = {
    title: "PRONAFECYT F10C - I+D Tecnológico (Diario de Experiencias)",
    sections: [
      {
        title: "Portada y Título",
        indicators: [
          "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
          "El título informa el contenido de la investigación; es breve, conciso y específico."
        ]
      },
      {
        title: "Índice e Introducción",
        indicators: [
          "Indica las principales secciones del trabajo y las páginas en las que se encuentran.",
          "Anota las ideas previas que motivan la realización del proyecto.",
          "Señala la importancia del problema o la necesidad que se desea resolver.",
          "Presenta la(s) pregunta(s) que orientan la investigación.",
          "Presenta el objetivo general y de uno a tres objetivos específicos de la investigación."
        ]
      },
      {
        title: "Justificación y Marco teórico",
        indicators: [
          "Justifica la relevancia del problema y la necesidad a abordar en la investigación (de forma cualitativa o cuantitativa).",
          "Describe los conceptos o términos técnicos relevantes que se aplican en la investigación, indicando las fuentes de información consultadas.",
          "Registra información adicional de diferentes fuentes que complementan las ideas previas planteadas.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
        ]
      },
      {
        title: "Metodología aplicada",
        indicators: [
          "Explica los pasos, procedimientos, métodos o técnicas utilizados en el desarrollo tecnológico.",
          "Presenta la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto preferiblemente reutilizable, requeridos en el desarrollo.",
          "Describe las metodologías de evaluación y perfeccionamiento del desarrollo tecnológico.",
          "Describe los recursos utilizados y el manejo de los residuos que pueden generarse, considerando la sostenibilidad ambiental.",
          "Incluye diagramas, esquemas, modelos o planos que evidencian el diseño del desarrollo tecnológico (previo y final)."
        ]
      },
      {
        title: "Logros obtenidos (Interpretación de los resultados)",
        indicators: [
          "Explica cómo los resultados de la investigación tienen un impacto positivo sobre el problema a resolver.",
          "Analiza posibles aplicaciones del desarrollo tecnológico obtenido en la sociedad.",
          "Contrasta o compara los resultados obtenidos con la información consultada, complementándola con reflexiones personales.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
          "Establece conclusiones y recomendaciones derivadas del trabajo realizado.",
          "Aporta evidencias (fotografías, manuales, listas de asistencia) acerca de la comunicación de los resultados a la comunidad educativa."
        ]
      },
      {
        title: "Referencias consultadas, Resumen y Bitácora",
        indicators: [
          "Presenta suficientes referencias que sustentan el trabajo.",
          "Aporta referencias de no más de 10 años y de fuentes confiables.",
          "Utiliza un formato de referencia bibliográfica consistente sea APA u otro.",
          "Contiene una síntesis de los aspectos más relevantes (máximo 250 palabras).",
          "Se presenta completa la bitácora, dando cuenta de las diferentes actividades realizadas (fecha, hora, actividad, resumen)."
        ]
      }
    ]
  };

  const F11C = {
    title: "PRONAFECYT F11C - Quehacer Científico y Tecnológico I y II Ciclos (Diario de Experiencias)",
    sections: [
      {
        title: "Portada e Índice",
        indicators: [
          "Contiene los elementos oficiales de la portada.",
          "El título del proyecto establece una idea general del trabajo realizado.",
          "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
        ]
      },
      {
        title: "Aspectos iniciales (Introducción y pregunta)",
        indicators: [
          "Anota las ideas previas que motivan la realización del proyecto.",
          "Señala la importancia del tema relacionado con el proyecto.",
          "Indica la(s) pregunta(s) que orientan el proyecto y las suposiciones o predicciones.",
          "Explica el propósito principal del proyecto."
        ]
      },
      {
        title: "Explorando fuentes de información (Marco teórico)",
        indicators: [
          "Describe palabras claves, conceptos o términos relevantes, indicando las fuentes de información consultadas.",
          "Registra información adicional de diferentes fuentes que complementan las ideas previas.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
        ]
      },
      {
        title: "Pasos por seguir (Metodología)",
        indicators: [
          "Explica los pasos, procedimientos o acciones realizadas en el proyecto.",
          "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto requeridos.",
          "Describe los recursos utilizados y el manejo de residuos considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "Logros y hallazgos",
        indicators: [
          "Comunica los hallazgos con la información consultada.",
          "Comunica los logros del proyecto.",
          "Comunica las fuentes de información consultadas.",
          "Expresa ideas propias relacionadas con la temática investigada.",
          "Evidencia el disfrute y apropiación del proyecto realizado.",
          "Aporta evidencias (fotografías, listas de asistencia, afiches) acerca de la comunicación de los resultados a la comunidad educativa."
        ]
      },
      {
        title: "Referencias consultadas y Resumen",
        indicators: [
          "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
          "Aporta referencias de no más de 10 años y de fuentes confiables.",
          "Utiliza un formato de referencia bibliográfica consistente (APA u otro).",
          "Presenta una síntesis de los aspectos más relevantes (máximo 250 palabras)."
        ]
      }
    ]
  };

  const F12C = {
    title: "PRONAFECYT F12C - Sumando Experiencias Científicas (Diario de Experiencias)",
    sections: [
      {
        title: "Portada e Índice",
        indicators: [
          "Contiene los elementos oficiales de la portada.",
          "El título del proyecto establece una idea general del trabajo realizado.",
          "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
        ]
      },
      {
        title: "Aspectos iniciales (Introducción y pregunta)",
        indicators: [
          "Anota las ideas previas que motivan la realización del proyecto.",
          "Señala la importancia del tema relacionado con el proyecto.",
          "Indica la(s) pregunta(s) que orientan el proyecto y las suposiciones o predicciones."
        ]
      },
      {
        title: "Explorando fuentes de información (Marco teórico)",
        indicators: [
          "Describe palabras claves, conceptos o términos relevantes, indicando las fuentes de información consultadas.",
          "Registra información adicional de diferentes fuentes que complementan las ideas previas.",
          "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
        ]
      },
      {
        title: "Plan de investigación (Metodología)",
        indicators: [
          "Explica las acciones o pasos realizados en el proyecto.",
          "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto requeridos.",
          "Describe los recursos utilizados y el manejo de residuos considerando la sostenibilidad ambiental."
        ]
      },
      {
        title: "Logros y hallazgos",
        indicators: [
          "Comunica los hallazgos con la información consultada.",
          "Comunica los logros del proyecto.",
          "Comunica las fuentes de información consultadas.",
          "Expresa ideas propias relacionadas con la temática investigada.",
          "Evidencia el disfrute y apropiación del proyecto realizado.",
          "Aporta evidencias (fotografías, listas de asistencia, afiches) acerca de la comunicación de los resultados a la comunidad educativa."
        ]
      },
      {
        title: "Referencias consultadas y Resumen",
        indicators: [
          "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
          "Aporta referencias de no más de 10 años y de fuentes confiables.",
          "Utiliza un formato de referencia bibliográfica consistente (APA u otro).",
          "Presenta una síntesis de los aspectos más relevantes (máximo 250 palabras)."
        ]
      }
    ]
  };

  const rubrics = {
    "F8B - Demostraciones Científicas y Tecnológicas": F8B,
    "F9B - Investigación Científica": F9B,
    "F10B - I+D Tecnológico": F10B,
    "F11B - Quehacer Científico y Tecnológico": F11B,
    "F12B - Sumando Experiencias Científicas": F12B,
    "F13B - Mi Experiencia Científica": F13B,
    "F8C - Demostraciones Científicas y Tecnológicas": F8C,
    "F9C - Investigación Científica": F9C,
    "F10C - I+D Tecnológico": F10C,
    "F11C - Quehacer Científico y Tecnológico": F11C,
    "F12C - Sumando Experiencias Científicas": F12C
  };

  const rubric = rubrics[category];
  if (rubric) {
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

  return null;
}

function getFestivalAdvancedScoreOptions() {
  return [
    { value: 3, label: "3 Avanzado" },
    { value: 2, label: "2 Basico" },
    { value: 1, label: "1 Intermedio" }
  ];
}

function getFestivalRubricBySubcategory(subcategory) {
  const normalizedSubcategory = String(subcategory ?? "").trim();

  const rubricBySubcategory = {
    "COREOGRAFIA DE BAILE": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
      "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes acorde con los objetivos, la Normativa y el Manual.",
      "La coreografia es original.",
      "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Participan unicamente estudiantes en escena.",
      "Dominio tecnico y expresivo del movimiento.",
      "Coherencia estetica, creatividad y relacion con el concepto."
    ],
    "COREOGRAFIA CONCEPTUAL": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "La coreografia se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El contenido, mensaje general y temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "La obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
      "La coreografia es original y desarrolla una historia, tema o idea clara con secuencias logicas.",
      "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Participan unicamente estudiantes en escena.",
      "Desarrollo conceptual y narrativo en la coreografia.",
      "Coherencia tecnico-artistica y estetica del concepto escenico."
    ],
    "COREOGRAFIA DE PROYECCION FOLCLORICA COSTARRICENSE": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
      "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
      "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Transmite ideas, sensaciones o conceptos que reflejan el folclor, las tradiciones y costumbres costarricenses.",
      "Representa o desarrolla una historia o anecdota tradicional, tipica o de costumbres costarricenses.",
      "Participan unicamente estudiantes en escena.",
      "Uso de ritmos y elementos coreograficos.",
      "Aspectos tecnico-artisticos, coherencia estetica y proyeccion escenica."
    ],
    "COREOGRAFIA FOLCLORICA INTERNACIONAL": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
      "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
      "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Transmite ideas, sensaciones o conceptos que reflejan el folclor, las tradiciones y costumbres del pais que representa.",
      "Representa o desarrolla una historia o anecdota tradicional, tipica o de costumbres del pais que proyecta.",
      "Presenta pasos, figuras, niveles, formas y vestuarios acordes con la musica que baila.",
      "Participan unicamente estudiantes en escena.",
      "Aspectos tecnico-artisticos, coherencia estetica y proyeccion escenica."
    ],
    "CUENTACUENTOS": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "El cuento u obra es original.",
      "Respeta la cantidad de integrantes: 1 estudiante.",
      "Respeta la duracion maxima de 5 minutos.",
      "Expresion oral: diccion y proyeccion vocal.",
      "Expresion corporal: postura, movimientos y desplazamiento.",
      "Entonacion.",
      "Uso del espacio escenico.",
      "Interpretacion.",
      "Sentido de la verdad.",
      "Aspectos tecnico-artisticos, estetica y proyeccion escenica intercultural."
    ],
    "NARRACION O RELATO ORAL INDIGENA ORIGINAL": [
      "La propuesta se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica de docentes, autoridades tradicionales y personas gestoras culturales.",
      "La narracion o relato oral indigena es original.",
      "Respeta la cantidad de integrantes: 1 estudiante.",
      "Respeta la duracion maxima de 5 minutos.",
      "Oralidad, voz y transmision del relato.",
      "Expresion general.",
      "Dinamica de la voz.",
      "Uso del espacio y simbolos.",
      "Apropiacion, sentido cultural y memoria.",
      "Presentacion."
    ],
    "NARRACION O RELATO INDIGENA DE TRADICION ANCESTRAL": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La narracion o relato indigena es tradicional o ancestral.",
      "Respeta la cantidad de integrantes: 1 estudiante.",
      "Respeta la duracion maxima de 5 minutos.",
      "Oralidad, voz y transmision del relato.",
      "Expresion general.",
      "Dinamica de la voz.",
      "Uso del espacio y simbolos.",
      "Interpretacion.",
      "Apropiacion, sentido cultural y memoria."
    ],
    "POESIA CORAL": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La poesia coral es original.",
      "Respeta la cantidad de integrantes: minimo tres estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Participan unicamente estudiantes en escena.",
      "Uso de figuras literarias.",
      "Utilizacion de figuras de construccion.",
      "Unidad de sentido o motivo lirico.",
      "Ritmo, musicalidad y desempeno grupal.",
      "Emotividad.",
      "Expresion oral.",
      "Expresion corporal.",
      "Relacion de la puesta en escena con la poesia.",
      "La poesia coral carece de rima."
    ],
    "RETAHILA": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La retahila es original.",
      "Respeta la cantidad de integrantes: 1 estudiante.",
      "Si el texto es presentado a mano utiliza letra legible; si es impreso, preferiblemente letra 12 Times New Roman.",
      "Uso de palabras autoctonas o adecuadas a la disciplina.",
      "Uso de figuras de construccion y de sentido.",
      "Tematica alusiva al festival.",
      "Concatenacion de ideas.",
      "Desempeno escenico.",
      "Originalidad.",
      "Musicalidad.",
      "Diccion."
    ],
    "TEATRO DE MUNECOS O TITERES": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La obra de teatro de titeres o munecos es original.",
      "Respeta la cantidad de integrantes: minimo 2 y maximo 5 estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Participan unicamente estudiantes como titiriteros/as.",
      "Expresion oral, diccion, entonacion, proyeccion y caracterizacion de voces.",
      "Manipulacion del titere.",
      "Unidad y comunicacion grupal.",
      "Fluidez del espectaculo.",
      "Creatividad y originalidad.",
      "Originalidad en el uso de materiales.",
      "Uniformidad y concordancia entre los titeres y la dramaturgia.",
      "Dramaturgia."
    ],
    "TEATRO DE NINOS Y NINAS": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La obra de teatro de ninos y ninas es original.",
      "Respeta la cantidad de integrantes: minimo 2 y maximo 10 estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Participan unicamente ninos y ninas de primaria.",
      "Expresion oral, diccion y proyeccion vocal.",
      "Expresion corporal.",
      "Maquillaje y vestuario.",
      "Uso del espacio escenico.",
      "Interpretacion.",
      "Sentido de la verdad.",
      "Unidad y comunicacion grupal.",
      "Fluidez.",
      "Dramaturgia."
    ],
    "TEATRO": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La obra de teatro es original.",
      "Respeta la cantidad de integrantes: minimo 2 y maximo 10 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Participan unicamente personas adolescentes, jovenes o adultas matriculadas en primaria o secundaria.",
      "Expresion oral, diccion y proyeccion vocal.",
      "Expresion corporal.",
      "Maquillaje y vestuario.",
      "Uso del espacio escenico.",
      "Interpretacion.",
      "Sentido de la verdad.",
      "Unidad y comunicacion grupal.",
      "Fluidez.",
      "Dramaturgia."
    ],
    "TEATRO DE NINOS Y NINAS INDIGENA": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La obra de teatro de ninos y ninas indigena es original.",
      "Respeta la cantidad de integrantes: minimo 2 y maximo 12 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Participan unicamente ninos y ninas indigenas de primaria.",
      "Tematica indigena.",
      "Uso de la palabra y la voz.",
      "Expresion corporal.",
      "Maquillaje y vestuario.",
      "Uso del espacio escenico.",
      "Interpretacion.",
      "Sentido de la verdad.",
      "Unidad y comunicacion grupal.",
      "Fluidez.",
      "Dramaturgia."
    ],
    "TEATRO INDIGENA": [
      "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La obra de teatro indigena es original.",
      "Respeta la cantidad de integrantes: minimo 2 y maximo 12 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Participan unicamente personas adolescentes, jovenes o adultas matriculadas en primaria o secundaria.",
      "Tematica indigena.",
      "Uso de la palabra y la voz.",
      "Expresion corporal.",
      "Maquillaje y vestuario.",
      "Uso del espacio escenico.",
      "Interpretacion.",
      "Sentido de la verdad.",
      "Unidad y comunicacion grupal.",
      "Fluidez.",
      "Dramaturgia."
    ],
    "DANZA CULTURAL INDIGENA COSTARRICENSE": [
      "La propuesta se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
      "Respeta la dignidad, diversidad humana y cosmovision indigena.",
      "Es evidente la mediacion pedagogica desde derechos humanos e interculturalidad.",
      "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Transmite ideas o sensaciones de la cosmovision, saberes y tradiciones indigenas costarricenses.",
      "Representa relatos, vivencias o expresiones culturales indigenas de Costa Rica.",
      "Participan unicamente estudiantes en escena.",
      "Movimientos y elementos dancisticos.",
      "Coherencia cultural y respeto a la cosmovision indigena.",
      "Aspectos generales: coordinacion grupal, presencia escenica, uso del espacio, claridad de movimientos, vestuario y accesorios acordes."
    ],
    "DANZA CULTURAL INDIGENA INTERNACIONAL": [
      "La propuesta se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
      "Respeta la dignidad, diversidad humana y cosmovision indigena.",
      "Es evidente la mediacion pedagogica desde derechos humanos e interculturalidad.",
      "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
      "Respeta la duracion maxima de 6 minutos.",
      "Transmite ideas o sensaciones de la cosmovision, saberes y tradiciones culturales indigenas.",
      "Representa relatos, vivencias o expresiones culturales propias de otros pueblos indigenas del mundo.",
      "Participan unicamente estudiantes en escena.",
      "Movimientos y elementos dancisticos.",
      "Coherencia cultural y respeto a la cosmovision indigena.",
      "Aspectos generales: coordinacion grupal, presencia escenica, uso del espacio, claridad de movimientos, vestuario y accesorios acordes."
    ],
    "BANDA DE GARAJE": [
      "La cancion se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "La letra de la cancion se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El contenido general y mensaje de la cancion incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La cancion es original.",
      "Respeta la cantidad de integrantes: minimo 3 y maximo 8 estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Respeta la instrumentacion base de banda de garaje.",
      "Participan unicamente estudiantes en interpretacion y direccion musical.",
      "Relacion y desarrollo de melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion.",
      "Estabilidad en el pulso.",
      "Afinacion vocal e instrumental.",
      "Mensaje de la letra.",
      "Interpretacion en vivo."
    ],
    "CANCION ORIGINAL": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival y sugerencias de temas.",
      "El contenido y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "La letra es adecuada a la etapa de desarrollo de adolescentes y jovenes.",
      "Es evidente la mediacion pedagogica docente.",
      "La cancion es original.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza un unico instrumento como base armonica.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion."
    ],
    "CANCION ORIGINAL DE NINOS Y NINAS": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "El contenido y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "La letra es adecuada a la edad y etapa de desarrollo de ninos y ninas.",
      "Es evidente la mediacion pedagogica docente.",
      "La cancion es original.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Es cantada unicamente por un nino o una nina.",
      "Utiliza un unico instrumento como base armonica.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion."
    ],
    "CANCION POPULAR": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
      "La letra es adecuada para adolescentes y jovenes.",
      "Es evidente la mediacion pedagogica docente.",
      "La letra promueve valores y buenas practicas.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza un unico instrumento como base armonica.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion."
    ],
    "CANCION POPULAR DE NINOS Y NINAS": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "La letra es adecuada para la edad del nino o nina.",
      "Es evidente la mediacion pedagogica docente.",
      "La cancion tiene un mensaje positivo para la ninez.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza un unico instrumento como base armonica.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion."
    ],
    "CANCION TIPICA ORIGINAL COSTARRICENSE": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
      "La letra es adecuada a la edad de quien la canta.",
      "Es evidente la mediacion pedagogica docente.",
      "La cancion es original.",
      "Expone aspectos propios de la identidad cultural y folclor costarricense.",
      "Utiliza ritmos tradicionales o tipicos costarricenses.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Puede haber hasta 3 personas en escena y maximo 3 instrumentos.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion."
    ],
    "CANCION TIPICA POPULAR COSTARRICENSE": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La obra se acoge a los objetivos del festival.",
      "La letra es adecuada a la edad de quien la canta.",
      "Es evidente la mediacion pedagogica docente.",
      "La letra expone aspectos propios de la identidad cultural y folclor costarricense.",
      "Utiliza ritmos tradicionales o tipicos costarricenses.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Puede haber hasta 3 personas en escena y maximo 3 instrumentos.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion.",
      "Letra con rescate de tradiciones, costumbres e historias costarricenses."
    ],
    "CANTAUTOR/A": [
      "La cancion se acoge al articulo 3 de la Normativa.",
      "La obra se acoge a los objetivos del festival.",
      "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la mediacion pedagogica docente.",
      "La cancion es original y compuesta por quien la canta.",
      "La letra promueve valores y experiencias positivas.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza un unico instrumento ejecutado por quien compuso la cancion.",
      "Relacion y desarrollo melodia-armonia-ritmo y letra.",
      "Diccion.",
      "Proyeccion de la voz.",
      "Precision en la ejecucion vocal y estabilidad en el ritmo.",
      "Entonacion y afinacion.",
      "Creatividad en la letra."
    ],
    "CANTO INDIGENA ORIGINAL": [
      "El canto se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "La letra es adecuada a la etapa de desarrollo de quien la interpreta.",
      "Es evidente la mediacion pedagogica docente.",
      "El canto es original.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza maximo 2 instrumentos.",
      "Presenta elementos de cosmovision, memoria viva y saberes indigenas.",
      "Aborda temas relacionados con territorios indigenas, naturaleza, convivencia, familia y valores."
    ],
    "CANTO INDIGENA TRADICIONAL O ANCESTRAL": [
      "El canto se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "La letra es adecuada a la etapa de desarrollo de quien la interpreta.",
      "Es evidente la mediacion pedagogica docente.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza maximo 2 instrumentos.",
      "Presenta elementos de cosmovision, memoria viva y saberes indigenas.",
      "Aborda temas relacionados con territorios indigenas, naturaleza, convivencia, familia y valores."
    ],
    "CANTO INDIGENA ORIGINAL DE NINOS Y NINAS": [
      "El canto se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "La letra es adecuada a la etapa de desarrollo de ninos y ninas.",
      "Es evidente la mediacion pedagogica docente.",
      "El canto es original.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza maximo 2 instrumentos.",
      "Presenta aspectos propios de la cosmovision y saberes indigenas.",
      "Aborda temas relacionados con naturaleza, territorio, convivencia, aprendizaje, juego, familia y valores."
    ],
    "CANTO INDIGENA DE NINOS Y NINAS: TRADICIONAL O ANCESTRAL": [
      "El canto se acoge al articulo 3 de la Normativa.",
      "La letra se acoge a los objetivos del festival.",
      "La letra es adecuada a la etapa de desarrollo de ninos y ninas.",
      "Es evidente la mediacion pedagogica docente.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "Utiliza maximo 2 instrumentos.",
      "Presenta aspectos propios de la cosmovision y saberes indigenas.",
      "Aborda temas relacionados con naturaleza, territorio, convivencia, aprendizaje, juego, familia y valores."
    ],
    "CIMARRONA": [
      "La obra artistica se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "El titulo de la obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El titulo incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La obra musical es original.",
      "Respeta la cantidad de integrantes: minimo 5 y maximo 12 estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Participan unicamente estudiantes tanto en la interpretacion como en la direccion musical.",
      "Mantiene el formato tradicional de la cimarrona costarricense.",
      "Desarrollo ritmico, melodico y armonico.",
      "Precision en la ejecucion ritmica.",
      "Afinacion general.",
      "Utiliza ritmos tipicos, folcloricos o tradicionales costarricenses."
    ],
    "CORO": [
      "La cancion se acoge al articulo 3 de la Normativa FEA 2026.",
      "La letra responde a los objetivos y temas del festival.",
      "El mensaje incorpora reflexion critica y analitica.",
      "Existe mediacion pedagogica docente.",
      "La cancion es original.",
      "Minimo 4 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Utiliza un instrumento o puede interpretarse a capela.",
      "Participan unicamente estudiantes en el coro.",
      "Relacion melodia-armonia-ritmo-letra.",
      "Diccion.",
      "Proyeccion vocal.",
      "Precision en la ejecucion.",
      "Estabilidad en el pulso.",
      "Afinacion vocal e instrumental.",
      "Mensaje positivo de la letra.",
      "Interpretacion totalmente en vivo."
    ],
    "ENSAMBLE DE FLAUTAS DULCES": [
      "La obra se acoge a la normativa del festival.",
      "El titulo responde a objetivos y temas del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Minimo 3 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Participan unicamente estudiantes.",
      "Utiliza unicamente flautas dulces.",
      "Relacion armonica entre melodia y armonia.",
      "Afinacion, entonacion y armonizacion.",
      "Precision ritmica.",
      "Interpretacion totalmente en vivo."
    ],
    "ENSAMBLE INSTRUMENTAL CON MATERIALES RECICLABLES O REUTILIZABLES": [
      "Se acoge al articulo 3 de la normativa.",
      "El titulo responde a los objetivos del festival.",
      "El titulo incorpora reflexion critica.",
      "Promueve sostenibilidad ambiental.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Minimo 4 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Solo participan estudiantes.",
      "Utiliza instrumentos construidos con materiales reciclables o reutilizables.",
      "Acople ritmico grupal.",
      "Creatividad e innovacion.",
      "Precision y claridad ritmica.",
      "Interpretacion totalmente en vivo."
    ],
    "ESTUDIANTINA": [
      "La cancion se acoge a la normativa.",
      "La letra responde a objetivos y temas del festival.",
      "Incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La cancion es original.",
      "Minimo 10 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Participan unicamente estudiantes.",
      "Mantiene caracteristicas propias de una estudiantina.",
      "Relacion melodia-armonia-ritmo-letra.",
      "Diccion.",
      "Proyeccion vocal.",
      "Precision en la ejecucion.",
      "Estabilidad en el pulso.",
      "Afinacion vocal e instrumental.",
      "Mensaje positivo de la letra.",
      "Interpretacion totalmente en vivo."
    ],
    "GRUPO INSTRUMENTAL EXPERIMENTAL": [
      "La obra se acoge a la normativa.",
      "El titulo responde a los objetivos del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Minimo 5 y maximo 15 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Integrado unicamente por estudiantes.",
      "Experimenta con al menos 3 de las 4 categorias sonoras establecidas.",
      "La obra es instrumental y experimental.",
      "Relacion melodia-armonia-ritmo.",
      "Precision en la ejecucion.",
      "Estabilidad en el pulso.",
      "Afinacion instrumental."
    ],
    "GRUPO INSTRUMENTAL": [
      "La obra se acoge a la normativa.",
      "El titulo responde a objetivos y temas del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Minimo 3 y maximo 15 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Los instrumentos son ejecutados unicamente por estudiantes.",
      "Relacion precisa entre armonia y melodia.",
      "Uso de melodia, armonia y ritmo.",
      "Afinacion correcta.",
      "Precision ritmica.",
      "Interpretacion totalmente en vivo."
    ],
    "GRUPO MUSICAL CULTURAL INSTRUMENTAL INDIGENA": [
      "La propuesta se acoge a la normativa.",
      "El titulo responde a objetivos y temas del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "Minimo 2 y maximo 15 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Solo estudiantes participan y dirigen.",
      "Interpretacion instrumental totalmente en vivo.",
      "Presenta cosmovision, memoria viva y saberes indigenas.",
      "Aborda territorios indigenas, naturaleza, convivencia y valores.",
      "Puede integrar danza, narracion, poesia y dramatizacion."
    ],
    "GRUPO MUSICAL CULTURAL INDIGENA": [
      "La propuesta se acoge a la normativa.",
      "El titulo responde a objetivos y temas del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "Minimo 2 y maximo 15 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Solo estudiantes participan y dirigen.",
      "Interpretacion totalmente en vivo con canto.",
      "Presenta cosmovision, memoria viva y saberes indigenas.",
      "Aborda territorios indigenas, naturaleza, convivencia y valores.",
      "Puede integrar danza, narracion, poesia y dramatizacion."
    ],
    "MARIMBA": [
      "La obra se acoge a la normativa.",
      "El titulo responde a objetivos y temas del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Utiliza unicamente ritmos folcloricos costarricenses autorizados.",
      "Individual o agrupacion de maximo 15 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Solo estudiantes interpretan la obra.",
      "La marimba es el instrumento principal.",
      "Relacion armonica entre melodia y armonia.",
      "Afinacion y armonizacion.",
      "Precision ritmica.",
      "Interpretacion totalmente en vivo."
    ],
    "PERCUSION CORPORAL": [
      "La obra se acoge a la normativa.",
      "El titulo responde a los objetivos del festival.",
      "El titulo incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La obra es original.",
      "Minimo 2 estudiantes.",
      "Duracion maxima de 5 minutos.",
      "Solo participan estudiantes.",
      "Utiliza unicamente el cuerpo humano como instrumento.",
      "Presenta elementos coreograficos o formaciones.",
      "Acople ritmico grupal.",
      "Originalidad y creatividad.",
      "Precision y claridad ritmica.",
      "Musicalidad.",
      "Interpretacion totalmente en vivo."
    ],
    "RAP": [
      "El rap se acoge a la normativa.",
      "La letra responde a los objetivos y temas del festival.",
      "Incorpora reflexion critica.",
      "Existe mediacion pedagogica docente.",
      "La cancion es original.",
      "Participacion estrictamente individual.",
      "Duracion maxima de 5 minutos.",
      "La mayor parte de la obra es rapeada.",
      "Utiliza un unico instrumento, pista o puede ser a capela.",
      "Relacion entre ritmo y letra.",
      "Diccion.",
      "Precision vocal y estabilidad ritmica.",
      "Proyeccion vocal.",
      "Precision en la ejecucion.",
      "Estabilidad en el pulso.",
      "Uso correcto del vocabulario."
    ],
    "ILUSTRACION DIGITAL": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "La obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
      "La propuesta artistica no visibiliza algun tipo de discriminacion.",
      "En el titulo de la obra incorpora un uso de lenguaje correcto y se basa en las sugerencias de temas del festival.",
      "Incorpora el uso de lenguaje correcto.",
      "Es evidente la mediacion pedagogica de las personas docentes y del centro educativo.",
      "La obra es original y no constituye copia o replica directa de disenos existentes.",
      "La obra constituye una ilustracion digital creada integramente con herramientas digitales.",
      "El dibujo, pintura, diseno, color, modelado digital, efectos y edicion son realizados por estudiantes.",
      "La obra evidencia uso de composicion, proporciones, iluminacion y color.",
      "La participacion es estrictamente individual.",
      "Integra intencionalmente los elementos del lenguaje visual: linea, forma, color, textura e iluminacion.",
      "Mantiene coherencia estetica y conceptual entre planificacion e ilustracion final.",
      "Desarrolla una composicion equilibrada mediante color, luz, sombra y jerarquias visuales.",
      "Emplea adecuadamente herramientas digitales de dibujo, pintura, capas, pinceles y ajustes.",
      "Produce la ilustracion en el formato, orientacion y resolucion establecidos."
    ],
    "MICRORRELATO ILUSTRADO DIGITAL": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema propuesto.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "El microrrelato ilustrado, tanto texto como ilustraciones, es original.",
      "Participacion individual o maximo 2 estudiantes.",
      "Respeta la extension de minimo 7 y maximo 200 palabras.",
      "Cumple con el formato digital de presentacion establecido.",
      "Presenta la ficha tecnica visible en la obra.",
      "Presenta narratividad y recursos discursivos como ironia, humor o parodia.",
      "Posee estructura simple, personajes minimamente caracterizados y condensacion temporal.",
      "Emplea adecuadamente recursos tematicos como intertextualidad o metaficcion.",
      "Utiliza correctamente puntuacion y ortografia.",
      "Mantiene extrema brevedad.",
      "Presenta concision, sintesis y condensacion narrativa.",
      "La ilustracion mantiene coherencia estetica y conceptual con el texto.",
      "Utiliza adecuadamente los elementos del lenguaje visual.",
      "Emplea herramientas digitales de ilustracion.",
      "Presenta una composicion equilibrada y clara visualmente."
    ],
    "MUSICA DIGITAL": [
      "La obra musical se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "El titulo de la obra se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El titulo y la letra incorporan una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La obra musical es original.",
      "Participacion individual o maximo 10 estudiantes.",
      "Respeta la duracion maxima de 10 minutos.",
      "Los dispositivos digitales, hardware, software y controladores son ejecutados unicamente por estudiantes.",
      "Presenta creatividad en la composicion.",
      "La armonia y melodia son coherentes.",
      "Utiliza preferiblemente los elementos constitutivos de la musica.",
      "Presenta precision general en la ejecucion.",
      "La ejecucion se realiza unicamente en vivo.",
      "Responde a las caracteristicas propias de la disciplina de musica digital.",
      "No utiliza instrumentos musicales acusticos, electroacusticos o electricos tradicionales."
    ],
    "CANTO POETICO INDIGENA": [
      "La propuesta se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "Participacion estrictamente individual.",
      "Respeta la duracion maxima de 5 minutos.",
      "Presenta caracter poetico, musical, cantado o narrado.",
      "Contiene memorias colectivas culturales, espirituales, linguisticas, territoriales o simbolicas propias de los pueblos indigenas.",
      "Presenta formatos como canto narrativo, canto ritual, poema cantado, relato poetico o fraseos musicales.",
      "Representa aspectos o elementos creativos basados en la tradicion oral ancestral de los pueblos originarios.",
      "Puede incorporar elementos contemporaneos propios de la creatividad estudiantil."
    ],
    "CUENTO": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "El cuento es original.",
      "Participacion estrictamente individual.",
      "Respeta la extension establecida: mas de 2 paginas y maximo 7 paginas.",
      "Presenta creatividad en la construccion narrativa.",
      "Desarrolla adecuadamente el tema.",
      "Presenta espacios narrativos coherentes.",
      "Existe efectividad del narrador.",
      "Presenta desarrollo adecuado de la trama.",
      "Emplea correctamente puntuacion y ortografia.",
      "Contiene introduccion.",
      "Contiene desarrollo.",
      "Contiene conclusion o desenlace."
    ],
    "CUENTO ILUSTRADO": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "El cuento ilustrado es original.",
      "Las ilustraciones se colocan de manera creativa y coherente.",
      "Participacion individual o maximo 2 estudiantes.",
      "Respeta la extension minima de 5 paginas.",
      "Presenta un minimo de 5 escenas ilustradas.",
      "Las ilustraciones estan en consonancia con el tema.",
      "Existe cohesion entre narracion e imagen.",
      "Emplea correctamente ortografia y puntuacion.",
      "Presenta prosa clara y fluida.",
      "Demuestra originalidad.",
      "Presenta creatividad en el empleo de tecnicas."
    ],
    "FOTONOVELA": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La fotonovela es original.",
      "Las fotografias se colocan de manera creativa y coherente.",
      "Participacion individual o maximo 2 estudiantes.",
      "Respeta la extension maxima de 15 paginas.",
      "Utiliza material adecuado y mantiene tama�o carta.",
      "Presenta calidad fotografica.",
      "Las fotografias son originales y alusivas al tema.",
      "Presenta una historia y trama coherente.",
      "Emplea correctamente ortografia y puntuacion.",
      "Presenta prosa clara y fluida.",
      "Demuestra creatividad mediante el empleo de diversas tecnicas."
    ],
    "MICRORRELATO": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "El microrrelato es original.",
      "Participacion estrictamente individual.",
      "Respeta la extension minima de 7 palabras y maxima de 200 palabras.",
      "Presenta narratividad y recursos como ironia, parodia o humor.",
      "Posee estructura simple.",
      "Presenta personajes minimamente caracterizados.",
      "Utiliza espacios esquematicos y condensacion temporal.",
      "Emplea recursos como intertextualidad y metaficcion.",
      "Utiliza correctamente puntuacion y ortografia.",
      "Mantiene extrema brevedad.",
      "Presenta concision, sintesis y condensacion narrativa."
    ],
    "NOVELA GRAFICA": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La novela grafica es original.",
      "Las imagenes se colocan de manera creativa y coherente.",
      "Participacion individual o maximo 3 estudiantes.",
      "Respeta la extension establecida en el manual.",
      "Presenta secuencia de introduccion, desarrollo, climax y conclusion.",
      "Existe relacion entre texto e imagen.",
      "Presenta originalidad en historia, personajes y disenos.",
      "Los personajes tienen representacion visual coherente.",
      "Utiliza correctamente ortografia y puntuacion.",
      "Presenta coherencia textual.",
      "Utiliza diferentes planos visuales.",
      "Crea un mundo narrado propio.",
      "Es una obra ficcional.",
      "Utiliza intertextos, intratextos o metaficcion.",
      "Presenta multiples personajes.",
      "Tiene narrador.",
      "Presenta hilo conductor.",
      "Utiliza vi�etas.",
      "Presenta textos narrativos, dialogos y onomatopeyas.",
      "Utiliza diferentes globos de texto.",
      "Incluye prologo como guia inicial de la historia."
    ],
    "POESIA": [
      "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La poesia es original.",
      "Participacion estrictamente individual.",
      "Se presenta en forma escrita.",
      "Emplea lenguaje poetico y figuras literarias.",
      "Presenta y desarrolla el motivo lirico.",
      "Expresa adecuadamente el yo lirico.",
      "Presenta fuerza lirica.",
      "Comunica emotividad.",
      "Posee calidad eufonica.",
      "Presenta capacidad de sintesis expresiva.",
      "Emplea correctamente las normas ortograficas.",
      "Carece de rima, acorde con las tendencias contemporaneas."
    ],
    "POESIA INDIGENA": [
      "La poesia se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y al tema.",
      "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
      "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
      "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
      "La poesia es original.",
      "Participacion estrictamente individual.",
      "Se presenta de forma escrita con letra legible.",
      "Desde un enfoque de derechos humanos, interculturalidad y no discriminacion, desarrolla una narrativa respetuosa y culturalmente pertinente.",
      "Mantiene coherencia con saberes, valores, cosmovisiones y formas de expresion de los pueblos indigenas.",
      "Resguarda el sentido educativo y formativo de la propuesta."
    ],
    "COLLAGE": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Promueve derechos humanos, identidad cultural, convivencia pacifica, igualdad, equidad, cultura de paz y conservacion ambiental.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "No visibiliza ningun tipo de discriminacion.",
      "El titulo utiliza lenguaje correcto y acorde con las tematicas del festival.",
      "Es evidente la mediacion pedagogica de las personas docentes y del centro educativo.",
      "La obra es original y no constituye una copia o imitacion.",
      "Se presenta sin marco.",
      "Respeta las dimensiones establecidas (minimo tama�o carta y maximo 30 x 40 cm).",
      "Utiliza materiales permitidos para la tecnica de collage.",
      "Participacion estrictamente individual.",
      "Organiza los elementos con distribucion espacial equilibrada y coherente.",
      "Experimenta con colores, texturas y formas de manera armonica.",
      "Presenta limpieza, acabados adecuados y atencion al detalle."
    ],
    "DIBUJO": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "El titulo utiliza lenguaje correcto y acorde con las tematicas propuestas.",
      "Evidencia mediacion pedagogica por parte del centro educativo.",
      "La obra es original.",
      "Se presenta sin marco.",
      "Respeta las dimensiones establecidas.",
      "Utiliza materiales y tecnicas permitidas.",
      "Participacion estrictamente individual.",
      "Emplea adecuadamente elementos como linea, forma, textura, luz, sombra y volumen.",
      "Demuestra dominio tecnico de los materiales utilizados.",
      "Relaciona el lenguaje visual con el mensaje o significado de la obra.",
      "Presenta soporte firme y adecuado.",
      "Mantiene limpieza y calidad en la ejecucion artistica."
    ],
    "DISENO DE OBJETO": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "No visibiliza ningun tipo de discriminacion.",
      "El titulo utiliza lenguaje correcto.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales resistentes y adecuados.",
      "Respeta las dimensiones y caracteristicas establecidas.",
      "Incluye pedestal proporcional cuando corresponde.",
      "Participacion individual o maximo tres estudiantes.",
      "Aplica principios de diseno como equilibrio, proporcion y contraste.",
      "Relaciona el lenguaje visual con el mensaje conceptual de la obra.",
      "Considera ergonomia, estabilidad y funcionalidad.",
      "Presenta acabados limpios y estetica adecuada."
    ],
    "ESCULTURA": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora una reflexion critica y analitica de la realidad actual.",
      "No visibiliza discriminacion.",
      "El titulo utiliza lenguaje correcto.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza tecnicas escultricas permitidas.",
      "Respeta dimensiones y materiales establecidos.",
      "Participacion estrictamente individual.",
      "Utiliza adecuadamente volumen, textura, equilibrio y proporcion.",
      "Relaciona el lenguaje visual con el significado de la obra.",
      "Evidencia dominio tecnico y buen manejo de materiales.",
      "Presenta base o pedestal estable.",
      "Logra una composicion tridimensional armonica."
    ],
    "ESCULTURAS VIVIENTES": [
      "La propuesta respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora reflexion critica de la realidad actual.",
      "No presenta contenidos discriminatorios.",
      "El titulo utiliza lenguaje correcto.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales seguros para la piel y el cuerpo.",
      "Presenta una propuesta integral de vestuario, maquillaje y utileria.",
      "Respeta los tiempos de preparacion establecidos.",
      "Participacion individual o maximo tres estudiantes.",
      "Utiliza adecuadamente la expresion corporal.",
      "Aprovecha el espacio escenico de forma pertinente.",
      "Emplea materiales y maquillaje coherentes con la propuesta.",
      "Caracteriza adecuadamente al personaje o escena representada.",
      "Relaciona el lenguaje visual con el mensaje de la obra."
    ],
    "FOTOGRAFIA": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos y tematicas del festival.",
      "Promueve convivencia, identidad cultural y respeto a la diversidad.",
      "Incorpora reflexion critica y analitica.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto.",
      "Evidencia mediacion pedagogica.",
      "La fotografia es original.",
      "Fue tomada por la persona estudiante participante.",
      "Respeta las dimensiones establecidas.",
      "Participacion estrictamente individual.",
      "Utiliza adecuadamente encuadre, iluminacion y composicion.",
      "Emplea composiciones fotograficas pertinentes.",
      "Presenta buena calidad de impresion y nitidez.",
      "Demuestra dominio tecnico en el uso de la imagen.",
      "Relaciona los elementos visuales con el mensaje artistico."
    ],
    "GRABADO": [
      "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos y tematicas sugeridas.",
      "Incorpora reflexion critica de la realidad actual.",
      "No visibiliza discriminacion.",
      "Utiliza lenguaje correcto en el titulo.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Se presenta sin marco.",
      "Respeta las dimensiones establecidas.",
      "Utiliza materiales y tecnicas permitidas.",
      "Participacion estrictamente individual.",
      "Presenta dominio tecnico del grabado.",
      "Utiliza soporte adecuado para impresion.",
      "Aplica correctamente los procedimientos de la tecnica seleccionada.",
      "Relaciona el lenguaje visual con el mensaje de la obra."
    ],
    "MASCARA INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Promueve identidad cultural y valoracion de las tradiciones indigenas.",
      "No presenta discriminacion.",
      "Rescata valores, costumbres y cosmovisiones indigenas.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Es elaborada por una persona estudiante indigena o matriculada en centro educativo indigena.",
      "Utiliza materiales tradicionales o propios de la cultura indigena.",
      "Emplea tecnicas acordes con la tradicion indigena.",
      "Participacion estrictamente individual.",
      "Aplica adecuadamente color, forma, textura y volumen.",
      "Representa elementos de la cosmovision indigena.",
      "Demuestra dominio tecnico de materiales y procesos.",
      "Mantiene proporcion y armonia en la estructura de la pieza."
    ],
    "MASCARA O CARETA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Promueve identidad cultural y aprecio por las tradiciones.",
      "No presenta discriminacion.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales permitidos.",
      "Emplea tecnicas adecuadas de elaboracion.",
      "No corresponde a una mascara indigena ni a una mascarada tradicional costarricense.",
      "Participacion estrictamente individual.",
      "Aplica principios de diseno como color, forma, textura y volumen.",
      "Relaciona elementos simbolicos con el mensaje de la obra.",
      "Demuestra dominio tecnico y estabilidad estructural.",
      "Presenta proporcion anatomica adecuada.",
      "Garantiza funcionalidad y ergonomia."
    ],
    "MASCARADA TRADICIONAL COSTARRICENSE": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Promueve identidad cultural costarricense.",
      "Rescata tradiciones y costumbres nacionales.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales adecuados para mascaradas tradicionales.",
      "Representa personajes tradicionales, miticos o folcloricos.",
      "Participacion individual o maximo tres estudiantes.",
      "Aplica principios de diseno visual.",
      "Integra personajes y elementos simbolicos de la tradicion costarricense.",
      "Demuestra dominio en construccion y ensamblaje.",
      "Presenta estabilidad, ligereza y funcionalidad.",
      "Mantiene proporcion, volumen y ergonomia.",
      "Comunica claramente la intencion cultural de la obra."
    ],
    "MURAL": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos y tematicas del festival.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "Utiliza lenguaje correcto en el titulo.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales adecuados para la tecnica mural.",
      "Respeta las dimensiones minimas establecidas.",
      "Participacion individual o maximo cinco estudiantes.",
      "Aplica adecuadamente los elementos del lenguaje visual.",
      "Demuestra dominio de tecnicas murales.",
      "Comunica claramente una idea o narracion visual.",
      "Garantiza durabilidad y acabado adecuado.",
      "Presenta registro visual del proceso de elaboracion."
    ],
    "PINTURA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos y tematicas sugeridas.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "Utiliza lenguaje correcto en el titulo.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales pictoricos permitidos.",
      "Se presenta sin marco.",
      "Respeta las dimensiones establecidas.",
      "Participacion estrictamente individual.",
      "Emplea adecuadamente color, textura, luz, sombra y volumen.",
      "Selecciona tecnicas acordes con la intencion artistica.",
      "Relaciona recursos visuales con el mensaje de la obra.",
      "Demuestra dominio tecnico de la pintura.",
      "Presenta soporte adecuado y estable."
    ],
    "PINTURA CORPORAL": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos y tematicas sugeridas.",
      "Incorpora reflexion critica de la realidad actual.",
      "No presenta discriminacion.",
      "Utiliza lenguaje correcto en el titulo.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Utiliza materiales seguros para la piel.",
      "Combina tecnicas y materiales de forma adecuada.",
      "Respeta el tiempo de ejecucion establecido.",
      "Participacion individual o maximo tres estudiantes.",
      "Emplea adecuadamente punto, linea, color y textura.",
      "Utiliza materiales y pigmentos apropiados.",
      "Integra la postura corporal a la propuesta artistica.",
      "Dise�a composiciones acordes con la anatomia del cuerpo.",
      "Relaciona los elementos visuales con el mensaje de la obra."
    ],
    "PRODUCCION AUDIOVISUAL": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No visibiliza ningun tipo de discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original.",
      "Respeta el Manual: la obra es un cortometraje, documental, biografia o video musical.",
      "Tiene introduccion, desarrollo, conclusion y creditos completos al final.",
      "Grabacion, filmacion, actuacion, fotografia y edicion realizadas por estudiantes.",
      "Respeta la duracion maxima de 5 minutos.",
      "Participacion individual o maximo 5 estudiantes.",
      "Articula el lenguaje visual con los elementos conceptuales de la obra.",
      "Garantiza coherencia entre sinopsis, guion literario y produccion final.",
      "Desarrolla guion estructurado con introduccion, desarrollo, conclusion y creditos.",
      "Utiliza adecuadamente recursos de audio, edicion y montaje.",
      "Realiza video en formato horizontal y cuida composicion visual, encuadre e iluminacion."
    ],
    "TENIDO TEXTIL": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora reflexion critica de la realidad actual.",
      "No visibiliza discriminacion.",
      "El titulo utiliza lenguaje correcto.",
      "Evidencia mediacion pedagogica.",
      "La obra es original.",
      "Respeta dimensiones: maximo 70 x 70 cm (formato libre).",
      "Utiliza materiales textiles permitidos (telas, fibras, tintes, colorantes, etc.).",
      "Expone obra con soporte adecuado (ganchos, prensas u otros; no se usan personas ni animales como soporte).",
      "Participacion individual o maximo 3 estudiantes.",
      "Emplea puntos, lineas, formas, texturas, color, calidad tonal, luz, sombra, volumen, planos y proporcion en la composicion textil.",
      "Selecciona y aplica tecnicas de tenido textil (estampacion, inkodye, shibori, tie dye u otras) de manera pertinente.",
      "Domina la tecnica de tenido seleccionada con manejo adecuado de materiales, procesos y metodos de fijacion.",
      "Articula el lenguaje visual con los elementos conceptuales de la obra.",
      "Presenta obra en soporte textil apropiado con buena absorcion y durabilidad.",
      "Cuida limpieza, uniformidad y prolijidad del acabado final."
    ],
    "DIBUJO INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a objetivos del festival: promueve identidad cultural, aprecio por tradiciones, derechos humanos y diversidad.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original.",
      "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
      "Se presenta sin marco (formato horizontal o vertical).",
      "Respeta dimensiones: minimo hoja carta, maximo 50 cm x 70 cm.",
      "Usa materiales de dibujo permitidos (lapices, carboncillo, marcadores, pigmentos, etc.).",
      "Participacion estrictamente individual.",
      "Utiliza elementos del lenguaje visual (puntos, lineas, formas, texturas, luz, sombra, color, calidad tonal y volumen) integrando simbolos y patrones de la cosmovision indigena.",
      "Domina la tecnica de dibujo con manejo preciso de materiales, control en linea, mancha, transiciones, degradados y acabados.",
      "Relaciona el lenguaje visual con la cosmovision indigena: naturaleza, memoria cultural y simbolos.",
      "Presenta soporte adecuado, estable y coherente con la tecnica y propuesta indigena."
    ],
    "ESCULTURA INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original.",
      "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
      "Utiliza tecnicas permitidas (modelado, talla, ensamble, intervencion, tecnica mixta).",
      "Respeta dimensiones: pieza de 20-40 cm alto x 10-20 cm ancho, largo max 50 cm.",
      "Usa materiales resistentes (papel mache, arcilla, madera, resina, metal, textil, etc.).",
      "Participacion estrictamente individual.",
      "Utiliza efectivamente elementos visuales (lineas, planos, formas, volumen, textura, peso visual, equilibrio y direccionalidad) integrados en composicion armonica con simbolos de la cosmovision indigena.",
      "Relaciona el lenguaje visual con conceptos de naturaleza, espiritualidad o memoria cultural indigena.",
      "Evidencia manejo tecnico adecuado, ejecucion limpia, estable y acorde a la tradicion indigena.",
      "Presenta base o pedestal solido y estable que soporta el peso de la escultura."
    ],
    "MURAL INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original.",
      "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
      "Usa materiales permitidos (tinta, acrilico, oleo, pintura aerosol, recortes, arcilla, textil, entre otros).",
      "Respeta dimensiones minimas: en pared o paneles 1.5 x 2 m; en plywood 1.22 x 2.44 m.",
      "Participacion individual o maximo 5 estudiantes.",
      "Aplica lenguaje visual (linea, forma, textura, color, proporcionalidad y espacio) con simbolos de la cosmovision indigena, manteniendo unidad estetica y relacion con el soporte.",
      "Utiliza tecnicas murales (pintura, mosaico, grabado, modelado, tecnicas mixtas, altos y bajos relieves o grafiti) con dominio del proceso.",
      "Articula lenguaje visual con el concepto de la obra, disenando propuesta que comunique imagen, narracion o idea desde la cosmovision indigena.",
      "Selecciona materiales y procedimientos que garantizan durabilidad, adherencia y acabado apropiado.",
      "Presenta registro visual claro del proceso de elaboracion."
    ],
    "OBJETO CULTURAL INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original, tiene funcion utilitaria y es coherente con procesos de creacion tradicionales indigenas.",
      "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
      "Utiliza materiales resistentes que evitan deterioro durante traslado, montaje y exposicion.",
      "Respeta dimensiones: maximo 30 cm base, 40 cm fondo, 40 cm altura; pedestal de 60 cm a 1 m.",
      "Participacion estrictamente individual.",
      "Aplica lenguaje visual en el diseno (forma, volumen, color y textura) integrando equilibrio, proporcion y contraste desde la cosmovision indigena para asegurar sentido utilitario.",
      "Relaciona lenguaje visual y diseno con elementos conceptuales de la obra, incorporando significados, simbolos o narrativas de tradiciones indigenas.",
      "Crea objeto que responde a criterios de ergonomia, estabilidad, resistencia estructural, sostenibilidad y utilidad."
    ],
    "PINTURA INDIGENA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No presenta discriminacion.",
      "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original.",
      "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
      "Utiliza materiales pictoricos permitidos (tintas, tempera, acrilico, acuarela, oleo, pigmentos naturales, etc.).",
      "Se presenta sin marco (formato horizontal, vertical, circular, ovalado u organico irregular).",
      "Respeta dimensiones: minimo hoja carta, maximo 70 cm x 1 m.",
      "Participacion estrictamente individual.",
      "Emplea puntos, lineas, formas, texturas, color, calidad tonal, saturacion, luz, sombra, volumen, planos y proporcion para construir composicion pictorica equilibrada con simbolos de la cosmovision indigena.",
      "Selecciona tecnica pertinente (tradicional o mixta) segun materiales y propositos expresivos, en coherencia con practicas y saberes indigenas.",
      "Articula lenguaje visual con elementos conceptuales de la obra, relacionando recursos plasticos con naturaleza, espiritualidad o memoria cultural indigena.",
      "Domina la tecnica seleccionada con control del material pictorico, precision en aplicacion, solidez en acabados y consistencia en procedimientos.",
      "Presenta obra en soporte firme, adecuado y coherente con la tecnica, garantizando estabilidad, durabilidad y armonia con la intencion indigena."
    ],
    "INSTALACION ARTISTICA": [
      "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
      "Se acoge a los objetivos del festival y a las sugerencias de temas.",
      "Incorpora reflexion critica y analitica de la realidad actual.",
      "No visibiliza discriminacion.",
      "El titulo utiliza lenguaje correcto y acorde con la propuesta.",
      "Evidencia mediacion pedagogica docente.",
      "La obra es original: no es copia de montajes existentes.",
      "Se compone de elementos y materiales diversos organizados en un espacio determinado.",
      "Disposicion espacial, materiales y dinamicas de recorrido disenados por estudiantes.",
      "Evidencia uso consciente de composicion espacial, relacion cuerpo-espacio, atmosfera e intencion conceptual-sensorial.",
      "Respeta cantidad de integrantes: individual o maximo 5 estudiantes.",
      "Integra intencionalmente elementos del lenguaje espacial (materialidad, luz, sonido, escala y disposicion) para construir experiencia coherente con la propuesta conceptual.",
      "Articula diseno de montaje, pruebas tecnicas y configuracion final alineados con la intencion conceptual del proyecto.",
      "Desarrolla composicion espacial equilibrada con uso intencional de materiales, recorridos, atmosferas y relaciones entre elementos.",
      "Utiliza adecuadamente tecnicas y recursos de instalacion (montaje, fijacion, distribucion espacial, iluminacion y ambientacion).",
      "Presenta instalacion estable, segura, con ubicacion clara de elementos y percepcion sensorial acorde a criterios del proyecto."
    ]
  };

  const indicators = rubricBySubcategory[normalizedSubcategory];

  if (!indicators) {
    return null;
  }

  return {
    indicators,
    scoreOptions: getFestivalAdvancedScoreOptions()
  };
}

function getFestivalRubricByCategory(category) {
  const normalizedCategory = String(category ?? "").trim();

  if (normalizedCategory === "Artes Escenicas") {
    return {
      indicators: [
        "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
        "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
        "La coreografia y temas musicales no irrespetan la dignidad y diversidad humana, derechos humanos y equidad de genero.",
        "Se evidencia mediacion pedagogica docente en pasos, movimientos y letras acordes con la normativa y manual.",
        "Respeta el Manual de disciplinas artisticas en originalidad de la coreografia, cantidad de integrantes (minimo 2), duracion maxima (6 minutos) y participacion exclusiva de estudiantes.",
        "Dominio tecnico y expresivo del movimiento: coordinacion general, presencia escenica, uso del espacio y orden de formaciones.",
        "Limpieza y claridad en movimientos, corporalidad acorde con la musica y musicalidad adecuada.",
        "Nivel de complejidad y control tecnico con cohesion y precision en la ejecucion coreografica.",
        "Coherencia estetica y creatividad: integra pasos, figuras, niveles y formas con concepto/tematica definida.",
        "Vestuario y maquillaje acordes con la musica y propuesta coreografica, reforzando identidad estetica e intencion conceptual."
      ],
      scoreOptions: getFestivalAdvancedScoreOptions()
    };
  }

  if (normalizedCategory === "Artes Musicales") {
    return {
      indicators: [
        "La cancion se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
        "La letra se acoge a los objetivos del festival y a las sugerencias de temas.",
        "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
        "Promueve conservacion del ambiente, vida silvestre, naturaleza y biodiversidad.",
        "El contenido y mensaje de la cancion incorpora reflexion critica y analitica de la realidad actual.",
        "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
        "Respeta el Manual en originalidad de la cancion, cantidad de integrantes (minimo 3, maximo 8) y duracion maxima (5 minutos).",
        "Respeta la instrumentacion base: bateria, bajo, guitarra y una o varias voces (con opcion de otros instrumentos complementarios).",
        "Participan unicamente estudiantes en interpretacion y direccion en escena.",
        "Cuida aspectos tecnico-artisticos: acople melodia-armonia-ritmo-letra, diccion, proyeccion de voz, precision, pulso, afinacion e interpretacion en vivo.",
        "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
      ],
      scoreOptions: getFestivalAdvancedScoreOptions()
    };
  }

  if (normalizedCategory === "Artes Digitales") {
    return {
      indicators: [
        "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
        "Se acoge a los objetivos del festival y a las sugerencias de temas.",
        "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
        "Promueve la conservacion del ambiente, la vida silvestre, la naturaleza y la biodiversidad.",
        "La obra incorpora una reflexion critica y analitica de la realidad actual.",
        "La propuesta artistica no visibiliza discriminacion.",
        "El titulo y el contenido de la obra incorporan uso correcto del lenguaje y se basan en sugerencias de temas del festival.",
        "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
        "Respeta el Manual en originalidad: la ilustracion no es copia ni replica directa y demuestra autenticidad.",
        "La obra constituye una ilustracion digital final (dibujo o pintura) creada integramente con herramientas digitales.",
        "Dibujo, pintura, diseno, color, modelado digital, efectos y edicion son realizados por estudiantes con software permitido para uso educativo.",
        "La obra evidencia composicion, proporciones, iluminacion y color con intencion visual digital clara.",
        "Respeta la cantidad de integrantes segun el Manual: participacion estrictamente individual.",
        "Integra intencionalmente linea, forma, color, textura e iluminacion para una imagen clara, expresiva y coherente con la propuesta conceptual.",
        "Asegura coherencia entre planificacion visual, referencias seleccionadas e ilustracion final durante todo el proceso creativo.",
        "Desarrolla composicion equilibrada con uso intencional de color, luz y sombra, y distribucion correcta de figuras, fondos y jerarquias.",
        "Emplea adecuadamente herramientas digitales de dibujo, pintura, capas, pinceles y ajustes para una imagen limpia y tecnicamente consistente.",
        "Produce la ilustracion en formato, orientacion y resolucion establecidos, cuidando disposicion de elementos, color y claridad visual.",
        "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
      ],
      scoreOptions: getFestivalAdvancedScoreOptions()
    };
  }

  if (normalizedCategory === "Artes Visuales") {
    return {
      indicators: [
        "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
        "Se acoge a los objetivos del festival y a las sugerencias de temas.",
        "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
        "Promueve la conservacion del ambiente, vida silvestre, naturaleza y biodiversidad.",
        "La obra incorpora reflexion critica y analitica de la realidad actual y no visibiliza discriminacion.",
        "El titulo incorpora uso correcto del lenguaje y se basa en las sugerencias de temas del festival.",
        "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
        "Respeta el Manual en originalidad: el diseno no es imitacion ni copia de otras propuestas.",
        "La obra se presenta sin marco (formato horizontal o vertical).",
        "Respeta dimensiones del Manual: tamano minimo carta y maximo 30 x 40 cm.",
        "Utiliza materiales permitidos (carton, cartulina, papel, recortes, telas, pintura, lapices de color, plastico, entre otros).",
        "Respeta la cantidad de integrantes segun el Manual: participacion estrictamente individual.",
        "Elabora el collage de forma ordenada con distribucion espacial equilibrada, jerarquia visual y recorte preciso de materiales.",
        "Experimenta con color, texturas y formas para lograr un resultado armonico durante el proceso de creacion.",
        "Finaliza el collage con atencion al detalle, acabado limpio y valoracion final de mejora segun la intencion artistica.",
        "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
      ],
      scoreOptions: getFestivalAdvancedScoreOptions()
    };
  }

  return {
    indicators: getRubricIndicatorsByFeria(FESTIVAL_FERIA_NAME),
    scoreOptions: getFestivalAdvancedScoreOptions()
  };
}

function buildFeriaOptions(selectedValue = "") {
  return FERIA_TYPES.map(
    (value) => `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`
  ).join("");
}

function renderJudgeRubric(indicators, scoreOptions = null) {
  const tbody = document.querySelector("[data-rubric-body]");
  const headRow = document.querySelector(".rubric-table thead tr");
  const options = scoreOptions && scoreOptions.length
    ? scoreOptions
    : [
        { value: 3, label: "3" },
        { value: 2, label: "2" },
        { value: 1, label: "1" },
        { value: 0, label: "0" }
      ];

  if (!tbody) {
    return;
  }

  if (headRow) {
    headRow.innerHTML = [
      "<th>Indicadores a evaluar</th>",
      ...options.map((item) => `<th>${escapeHTML(item.label)}</th>`)
    ].join("");
  }

  if (!indicators.length) {
    tbody.innerHTML = `<tr><td colspan="${options.length + 1}">No hay indicadores configurados para esta feria.</td></tr>`;
    return;
  }

  const rows = [];
  let globalIndex = 0;

  indicators.forEach((item) => {
    if (typeof item === "string") {
      const fieldName = `indicador_${globalIndex}`;
      const cells = options
        .map(
          (opt, oi) => `<td><label class="rubric-radio-label"><input type="radio" name="${fieldName}" value="${opt.value}" ${oi === 0 ? "required" : ""} aria-label="${escapeHTML(item)} - ${escapeHTML(opt.label)}"></label></td>`
        )
        .join("");
      rows.push(`<tr><td>${escapeHTML(item)}</td>${cells}</tr>`);
      globalIndex++;
    } else if (item.section) {
      rows.push(`<tr class="rubric-section"><td colspan="${options.length + 1}"><strong>${escapeHTML(item.section)}</strong></td></tr>`);
    }
  });

  tbody.innerHTML = rows.join("");
}

async function renderProjectResults() {
  const list = document.querySelector("[data-project-results]");

  if (!list) {
    return;
  }

  showSkeleton(list, 5);

  const { data, error } = await supabase
    .from("resultados_finales_proyectos")
    .select("proyecto_id, titulo, resultado_final, total_jueces")
    .order("titulo", { ascending: true });

  if (error) {
    setMessage(document.querySelector("[data-project-results-status]"), "No se pudieron cargar los resultados.", "error");
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<tr><td colspan="3">No hay proyectos registrados.</td></tr>';
    return;
  }

  list.innerHTML = data
    .map((item) => `<tr><td>${item.titulo}</td><td>${item.resultado_final}</td><td>${item.total_jueces}</td></tr>`)
    .join("");
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
      grouped.set(pid, { title: projectsById.get(pid)?.titulo ?? "Proyecto", rows: [] });
    }
    grouped.get(pid).rows.push(row);
  });

  const projectIds = [...grouped.keys()];
  const currentTab = projectIds[0];

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

    const table = document.createElement("table");
    table.className = "results-table";
    table.innerHTML = `<thead><tr><th>Juez</th><th>Criterio</th><th>Nota</th></tr></thead>`;

    const tbody = document.createElement("tbody");
    tbody.innerHTML = data.rows
      .map((row) => {
        const judgeName = usersById.get(row.juez_id)?.nombre ?? "Juez";
        return `<tr><td><span class="role-badge role-judge">${escapeHTML(judgeName)}</span></td><td>${escapeHTML(row.criterio)}</td><td>${row.nota}</td></tr>`;
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
      const projectName = projectsById.get(projectId)?.titulo ?? "Proyecto";
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

function renderAdminScoresTable(rows, projectsById, assignmentsByProject) {
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

  if (!assignmentsByProject?.size) {
    tbody.innerHTML = '<tr><td colspan="4">No hay jueces asignados a proyectos.</td></tr>';
    return;
  }

  const results = [];

  for (const [projectId, assignedJudges] of assignmentsByProject) {
    if (!projectsById.has(projectId)) continue;

    const expoJudges = [];
    const escritoJudges = [];
    let expoVoted = 0, expoTotal = 0;
    let escritoVoted = 0, escritoTotal = 0;

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

    results.push({
      projectName: projectsById.get(projectId)?.titulo ?? "Proyecto",
      expoJudges, escritoJudges,
      expoTotal, expoVoted,
      escritoTotal, escritoVoted,
      finalScore: calcFinalScore(expoVoted, expoAvg, escritoVoted, escritoAvg)
    });
  }

  results.sort((a, b) => b.finalScore - a.finalScore);

  const highScoreEl = document.querySelector("[data-highest-score]");
  if (highScoreEl && results.length > 0) {
    highScoreEl.textContent = results[0].finalScore.toFixed(0);
  }

  tbody.innerHTML = results
    .map((r) => {
      const totalVoted = r.expoVoted + r.escritoVoted;
      const totalAssigned = r.expoTotal + r.escritoTotal;
      const pct = totalAssigned > 0 ? Math.round(totalVoted / totalAssigned * 100) : 0;
      const barColor = pct === 100 ? "var(--secondary)" : pct > 50 ? "var(--secondary-light)" : "var(--ink-secondary)";
      return `<tr>
        <td>
          <strong>${escapeHTML(r.projectName)}</strong>
          <div class="judge-progress-wrap">
            <div class="judge-progress-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <span class="judge-status">${totalVoted}/${totalAssigned} jueces (${pct}%)</span>
        </td>
        <td>${formatJudgeColumn(r.expoJudges, r.expoVoted, r.expoTotal)}</td>
        <td>${formatJudgeColumn(r.escritoJudges, r.escritoVoted, r.escritoTotal)}</td>
        <td class="score-cell"><strong>${r.finalScore.toFixed(0)}</strong></td>
      </tr>`;
    })
    .join("");
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

  const [users, projectsResult, evaluationsResult, assignmentsResult] = await Promise.all([
    loadUsers(),
    supabase.from("proyectos_ferias").select("id, titulo, tipo_feria"),
    supabase.from("evaluaciones_proyectos").select("proyecto_id, juez_id, criterio, nota, tipo_evaluacion").order("created_at", { ascending: false }),
    supabase.from("asignaciones_jueces").select("juez_id, proyecto_id, tipo_evaluacion")
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }

  if (evaluationsResult.error) {
    throw evaluationsResult.error;
  }

  const allProjects = projectsResult.data ?? [];
  const filteredProjects = selectedFeria
    ? allProjects.filter((p) => p.tipo_feria === selectedFeria)
    : allProjects;

  const projectIdsInFeria = new Set(filteredProjects.map((p) => p.id));

  const usersById = new Map((users ?? []).map((item) => [item.id, item]));
  const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
  const filteredRows = (evaluationsResult.data ?? []).filter((r) =>
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
        judgeName: usersById?.get(a.juez_id)?.nombre ?? `Juez #${a.juez_id}`
      });
    }
  });

  renderAdminEvaluationsTable(filteredRows, usersById, projectsById);
  renderAdminProjectsTable(filteredRows, projectsById);
  renderAdminScoresTable(filteredRows, projectsById, assignmentsByProject);

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
      titulo: project?.titulo ?? "Proyecto",
      tipo_evaluacion: assignment.tipo_evaluacion ?? "Exposición"
    });
    assignmentsByJudge.set(assignment.juez_id, current);
  });

  tbody.innerHTML = judges
    .map((judge) => {
      const judgeAssignments = assignmentsByJudge.get(judge.id) ?? [];

      const projectList = judgeAssignments.length
        ? judgeAssignments.map((a) =>
            `${escapeHTML(a.titulo)} <span class="tipo-badge tipo-badge--${a.tipo_evaluacion === "Escrito" ? "escrito" : "expo"}">${escapeHTML(a.tipo_evaluacion)}</span>`
          ).join("<br>")
        : '<span class="text-muted">Sin proyectos asignados</span>';

      const count = judgeAssignments.length;

      return `
        <tr data-judge-row data-judge-id="${judge.id}">
          <td><strong>${escapeHTML(judge.nombre)}</strong></td>
          <td class="assigned-projects-cell">${projectList}</td>
          <td>
            <button type="button" class="btn-secondary btn-sm" data-open-assign-modal data-judge-id="${judge.id}" data-judge-name="${escapeHTML(judge.nombre)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
              Asignar (${count}/8)
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

  nameEl.textContent = `Juez: ${judgeName}`;
  overlay.hidden = false;

  const assignedIds = new Set(currentAssignments.map((a) => a.id));
  const selectedTipoMap = new Map(currentAssignments.map((a) => [a.id, a.tipo_evaluacion]));

  function renderList() {
    const checkedCount = listEl.querySelectorAll("[data-project-checkbox]:checked").length;
    counterEl.textContent = `${checkedCount}/8 seleccionados`;

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

    if (checkedCount >= 8) {
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
    const tipoVal = supportsDualEval
      ? (selectedTipoMap.get(project.id) ?? "Exposición")
      : "Exposición";

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

    if (assignments.length > 8) {
      showToast("Maximo 8 proyectos por juez.", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    try {
      const { error: deleteError } = await supabase.from("asignaciones_jueces").delete().eq("juez_id", judgeId);
      if (deleteError) throw deleteError;

      if (assignments.length > 0) {
        const payload = assignments.map((a) => ({
          juez_id: judgeId,
          proyecto_id: a.proyecto_id,
          tipo_evaluacion: a.tipo_evaluacion
        }));
        const { error: insertError } = await supabase.from("asignaciones_jueces").insert(payload);
        if (insertError) throw insertError;
      }

      showToast("Asignacion guardada correctamente.", "success");
      closeAssignmentModal();

      const refreshEvent = new CustomEvent("assignments-changed");
      document.dispatchEvent(refreshEvent);
    } catch {
      showToast("No se pudo guardar la asignacion.", "error");
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

async function verifySupabaseStatus() {
  const statusEls = document.querySelectorAll("[data-supabase-status]");

  try {
    const { error } = await supabase.from("roles").select("id").limit(1);

    statusEls.forEach((el) => {
      el.textContent = error ? "Conectado a Supabase, pero revisa tablas o permisos." : "Conectado a Supabase.";
    });
  } catch {
    statusEls.forEach((el) => {
      el.textContent = "No se pudo validar la conexion a Supabase.";
    });
  }
}

function enforceRole(requiredRole) {
  const user = getSession();
  const authStatus = document.querySelector("[data-auth-status]");
  const normalizedRequiredRole = normalizeRoleName(requiredRole);

  if (!user) {
    window.location.href = "index.html";
    return null;
  }

  const normalizedSessionRole = normalizeRoleName(user.role);

  if (normalizedSessionRole !== normalizedRequiredRole) {
    setMessage(authStatus, `Acceso denegado: esta pagina es solo para ${normalizedRequiredRole}.`, "error");
    return null;
  }

  const normalizedUser = { ...user, role: normalizedSessionRole };

  return normalizedUser;
}

async function bootstrapLoginPage() {
  setupHideOnScroll();
  const user = getSession();
  const sessionRole = normalizeRoleName(user?.role);

  if (sessionRole === "Juez") {
    window.location.href = "evaluaciones.html";
    return;
  }

  if (sessionRole === "administrador") {
    window.location.href = "Proyectos.html";
    return;
  }

  const form = document.querySelector("[data-login-form]");
  const status = document.querySelector("[data-login-status]");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const originalText = btn.textContent;

    const formData = new FormData(form);
    const usuario = String(formData.get("usuario") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!usuario || !password) {
      setMessage(status, "Completa usuario y contrase�a.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Ingresando...";

    try {
      const { data, error } = await loadUserForLogin(usuario);

      if (error) {
        throw error;
      }

      if (!data || !(await passwordMatches(password, data.contrasena_hash))) {
        setMessage(status, "Credenciales invalidas.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("nombre")
        .eq("id", data.role_id)
        .maybeSingle();

      if (roleError) {
        throw roleError;
      }

      const roleName = normalizeRoleName(roleData?.nombre);

      if (!roleName) {
        setMessage(status, "El usuario no tiene rol asignado.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      saveSession({ id: data.id, nombre: data.nombre, role: roleName, tipo_feria: data.tipo_feria ?? null });

      if (roleName === "Juez") {
        window.location.href = "evaluaciones.html";
        return;
      }

      if (roleName === "administrador") {
        window.location.href = "Proyectos.html";
        return;
      }

      setMessage(status, `Rol no soportado para redireccion: ${roleName}.`, "error");
    } catch {
      setMessage(status, "No se pudo iniciar sesion.", "error");
    }

    btn.disabled = false;
    btn.textContent = originalText;
  });
}

async function bootstrapJudgePage() {
  bindLogout();
  highlightActiveNavLink();
  setupHideOnScroll();
  setupHamburgerMenu();

  const user = enforceRole("Juez");

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
  const categoryFilter = document.querySelector("[data-judge-category-filter]");
  const categorySelect = document.querySelector("[data-judge-category-select]");
  const categoryStatus = document.querySelector("[data-judge-category-status]");
  let assignedProjectsCache = [];
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
    currentRubricModel = resolveRubricModelForProject(projectId);
    renderJudgeRubric(currentRubricModel.indicators, currentRubricModel.scoreOptions);
    loadSavedEvaluations(projectId, user.id);

    const badge = document.querySelector("[data-evaluation-type-badge]");
    if (badge) {
      const selectedProject = assignedProjectsCache.find((item) => Number(item.id) === Number(projectId));
      const tipo = selectedProject?.tipo_evaluacion ?? "Exposición";
      badge.textContent = tipo;
      badge.dataset.tipo = tipo;
      badge.hidden = false;
    }
  }

  async function loadSavedEvaluations(projectId, judgeId) {
    if (!projectId) return;
    const selectedProject = assignedProjectsCache.find((p) => Number(p.id) === Number(projectId));
    const tipoEval = selectedProject?.tipo_evaluacion ?? "Exposición";
    const { data, error } = await supabase
      .from("evaluaciones_proyectos")
      .select("criterio, nota")
      .eq("proyecto_id", projectId)
      .eq("juez_id", judgeId)
      .eq("tipo_evaluacion", tipoEval);
    if (error || !data || !data.length) return;
    const lookup = new Map(data.map((r) => [r.criterio.trim(), r.nota]));
    let inputIndex = 0;
    currentRubricModel.indicators.forEach((criterio) => {
      if (typeof criterio !== "string") return;
      const saved = lookup.get(criterio.trim());
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
    if (!activeCategoryFilter) return projects;

    const projectFeria = projects.length ? (projects[0].tipo_feria ?? userFeria) : userFeria;
    const isFestival = projectFeria === FESTIVAL_FERIA_NAME;
    const isScientific = projectFeria === "Feria Cientifica y Tecnologica";
    let categoryField = isFestival ? "categoria_festival" : "categoria_expotecnica";
    if (isScientific) categoryField = "categoria_pronatecyt";
    return projects.filter((p) => String(p[categoryField] ?? "") === activeCategoryFilter);
  }

  async function refreshJudgeData() {
    try {
      const assignedProjects = await loadAssignedProjectsForJudge(user.id);
      assignedProjectsCache = assignedProjects;

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

      fillSelectGroupedByTipo(projectSelect, projectsForSelect, new Set());

      if (projectSelect?.value) {
        applyRubricForSelection(projectSelect.value);
      } else {
        applyRubricForSelection(filteredProjects[0]?.id ?? "");
      }

      if (!filteredProjects.length) {
        const msg = activeCategoryFilter
          ? `No hay proyectos en la categoria "${activeCategoryFilter}".`
          : "Este juez no tiene proyectos asignados por el admin.";
        setMessage(evaluationStatus, msg, "error");
      }

      const { data, error } = await supabase
        .from("evaluaciones_proyectos")
        .select("id, proyecto_id, criterio, nota, tipo_evaluacion, proyectos_ferias(titulo)")
        .eq("juez_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const evaluatedKeys = new Set((data ?? []).map((e) => `${e.proyecto_id}-${e.tipo_evaluacion ?? "Exposición"}`));

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
          groupedByProject.set(key, {
            titulo: item.proyectos_ferias?.titulo ?? "Proyecto",
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
    currentRubricModel.indicators.forEach((criterio) => {
      if (typeof criterio !== "string") return;
      const nota = Number(formData.get(`indicador_${inputIndex}`));
      evaluaciones.push({ criterio, nota });
      inputIndex++;
    });

    if (!proyectoId || evaluaciones.some((item) => Number.isNaN(item.nota))) {
      setMessage(evaluationStatus, "Completa todos los campos de la evaluacion.", "error");
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

        let { error } = await supabase.from("evaluaciones_proyectos").upsert(payload, { onConflict: "proyecto_id, juez_id, tipo_evaluacion, criterio", ignoreDuplicates: false });

        if (error) {
          await supabase.from("evaluaciones_proyectos").delete().eq("proyecto_id", proyectoId).eq("juez_id", user.id).eq("tipo_evaluacion", tipoEval);
          const { error: insertError } = await supabase.from("evaluaciones_proyectos").insert(payload);
          if (insertError) throw insertError;
        }

      evaluationForm.reset();
      showToast("Evaluacion guardada correctamente.", "success");
      await refreshJudgeData();
    } catch {
      showToast("No se pudo guardar la evaluacion.", "error");
    }

    btn.disabled = false;
    btn.textContent = originalText;
  });
}

async function bootstrapAdminPage() {
  bindLogout();
  highlightActiveNavLink();
  setupHideOnScroll();
  setupHamburgerMenu();
  const user = enforceRole("administrador");

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
        setMessage(userStatus, "Completa todos los campos del usuario.", "error");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const contrasenaHash = await hashPassword(contrasena);
        const { error } = await supabase.from("usuarios").insert({
          nombre,
          contrasena_hash: contrasenaHash,
          tipo_feria: tipoFeria,
          role_id: roleId
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
        setMessage(projectStatus, "Completa nombre y tipo de feria del proyecto.", "error");
        return;
      }

      if (!isFestival && (!integrante1 || !integrante2 || !integrante3)) {
        setMessage(projectStatus, "Completa los 3 integrantes del proyecto.", "error");
        return;
      }

      if (!isFestival && new Set([integrante1.toLowerCase(), integrante2.toLowerCase(), integrante3.toLowerCase()]).size !== 3) {
        setMessage(projectStatus, "Los nombres de integrantes deben ser diferentes.", "error");
        return;
      }

      if (isFestival) {
        if (!FESTIVAL_CATEGORIES.includes(categoriaFestival) || !(FESTIVAL_SUBCATEGORIES[categoriaFestival] ?? []).includes(subcategoriaFestival) || !participacion) {
          setMessage(projectStatus, "Para Festival debes seleccionar categoria, subcategoria y escribir la participacion.", "error");
          return;
        }
      } else if (isExpotecnica) {
        if (!EXPOTECNICA_CATEGORIES.includes(categoriaExpotecnica) || !EXPOTECNICA_EJES.includes(ejeTematico)) {
          setMessage(projectStatus, "Para ExpoTECNICA debes seleccionar categoria y eje tematico.", "error");
          return;
        }
      } else if (isScientific) {
        if (!PRONAFECYT_CATEGORIES.includes(categoriaPronatecyt)) {
          setMessage(projectStatus, "Para Feria Cientifica debes seleccionar una categoria PRONAFECYT.", "error");
          return;
        }
      }

      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const payload = {
          titulo,
          descripcion: descripcion || null,
          creador_id: user.id,
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

        let insertResult = await supabase.from("proyectos_ferias").insert(payload);

        if (insertResult.error) {
          if (!isMissingColumnError(insertResult.error, "integrante_") &&
              !isMissingColumnError(insertResult.error, "categoria_festival") &&
              !isMissingColumnError(insertResult.error, "subcategoria_festival") &&
              !isMissingColumnError(insertResult.error, "participacion") &&
              !isMissingColumnError(insertResult.error, "categoria_expotecnica") &&
              !isMissingColumnError(insertResult.error, "eje_tematico") &&
              !isMissingColumnError(insertResult.error, "categoria_pronatecyt")) {
            throw insertResult.error;
          }

          insertResult = await supabase.from("proyectos_ferias").insert({
            titulo,
            descripcion: descripcion || null,
            creador_id: user.id,
            tipo_feria: tipoFeria
          });
        }

        if (insertResult.error) {
          throw insertResult.error;
        }

        projectForm.reset();
        const resetFeriaInput = projectForm.querySelector('input[name="tipo_feria"]');
        if (resetFeriaInput && user.tipo_feria) resetFeriaInput.value = user.tipo_feria;
        showToast("Proyecto guardado correctamente.", "success");
        setMessage(projectStatus, "Proyecto guardado correctamente.", "success");
        await refreshAdminDataView();
      } catch (err) {
        showToast(err?.message || "No se pudo guardar el proyecto.", "error");
        setMessage(projectStatus, err?.message || "No se pudo guardar el proyecto.", "error");
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
      const row = btn.closest("[data-judge-row]");
      const existingProjects = [...document.querySelectorAll(".assigned-projects-cell")];

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
        try {
          const projectData = JSON.parse(editBtn.dataset.editProject);
          showEditProjectModal(projectData);
        } catch {
          showToast("Error al leer datos del proyecto.", "error");
        }
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
          const { error } = await supabase.from("proyectos_ferias").delete().eq("id", projectId);

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

}

function pdfSubHeader(doc, title, y) {
  doc.setDrawColor(...PDF.GOLD);
  doc.setLineWidth(0.8);
  doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF.PRIMARY);
  doc.text(title, PDF.MARGIN, y);
  y += 8;
  return y;
}

async function generateAdminPDF() {
  await loadJSPDF();
  const logoData = await loadMEPLogo();

  try {
    const [users, projectsResult, evaluationsResult, assignmentsResult] = await Promise.all([
      loadUsers(),
      supabase.from("proyectos_ferias").select("id, titulo, tipo_feria, categoria_expotecnica, categoria_pronatecyt"),
      supabase.from("evaluaciones_proyectos").select("proyecto_id, juez_id, criterio, nota, tipo_evaluacion").order("created_at", { ascending: false }),
      supabase.from("asignaciones_jueces").select("juez_id, proyecto_id, tipo_evaluacion")
    ]);

    if (projectsResult.error || evaluationsResult.error) {
      throw new Error("Error al cargar datos");
    }

    const filterEl = document.querySelector("[data-feria-results-filter]");
    const selectedFeria = filterEl ? filterEl.value : "";
    const allProjects = projectsResult.data ?? [];
    const filteredProjects = selectedFeria
      ? allProjects.filter((p) => p.tipo_feria === selectedFeria)
      : allProjects;

    const projectIds = new Set(filteredProjects.map((p) => p.id));
    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const projectsById = new Map(filteredProjects.map((item) => [item.id, item]));
    const evaluations = (evaluationsResult.data ?? []).filter((r) => projectIds.has(r.proyecto_id));

    if (!evaluations.length) {
      showToast("No hay evaluaciones para generar el reporte.", "info");
      return;
    }

    // Build score data per project per judge per tipo
    const votedSet = new Set();
    const scoreMap = new Map();
    evaluations.forEach((row) => {
      const tipo = row.tipo_evaluacion ?? "Exposición";
      const key = `${row.proyecto_id}-${row.juez_id}-${tipo}`;
      votedSet.add(key);
      const nota = Number(row.nota);
      if (!Number.isNaN(nota)) {
        scoreMap.set(key, (scoreMap.get(key) || 0) + nota);
      }
    });

    // Group assignments by project
    const assignmentsByProject = new Map();
    (assignmentsResult.data ?? []).forEach((a) => {
      if (projectIds.has(a.proyecto_id)) {
        if (!assignmentsByProject.has(a.proyecto_id)) {
          assignmentsByProject.set(a.proyecto_id, []);
        }
        assignmentsByProject.get(a.proyecto_id).push({
          juez_id: a.juez_id,
          tipo_evaluacion: a.tipo_evaluacion ?? "Exposición",
          judgeName: usersById?.get(a.juez_id)?.nombre ?? `Juez #${a.juez_id}`
        });
      }
    });

    // Build results (same logic as renderAdminScoresTable)
    const results = [];
    for (const [projectId, assignedJudges] of assignmentsByProject) {
      if (!projectsById.has(projectId)) continue;
      const expoJudges = [];
      const escritoJudges = [];
      let expoVoted = 0, expoTotal = 0;
      let escritoVoted = 0, escritoTotal = 0;

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
      const evalComplete =
        (expoTotal === 0 || expoVoted === expoTotal) &&
        (escritoTotal === 0 || escritoVoted === escritoTotal);
      results.push({
        projectName: projectsById.get(projectId)?.titulo ?? "Proyecto",
        projectId,
        expoJudges, escritoJudges,
        expoTotal, expoVoted,
        escritoTotal, escritoVoted,
        expoAvg, escritoAvg,
        evalComplete,
        finalScore: evalComplete ? calcFinalScore(expoVoted, expoAvg, escritoVoted, escritoAvg) : 0
      });
    }
    results.sort((a, b) => b.finalScore - a.finalScore);

    // Find rubric max scores per project type
    function getMaxScoreForProject(pid, tipo) {
      const p = projectsById.get(pid);
      if (!p) return 0;
      const feria = p.tipo_feria ?? "";
      if (feria === "Feria Expotecnica") {
        const cat = p.categoria_expotecnica ?? "";
        if (!cat) return tipo === "Escrito" ? 72 : 51;
        const rubric = getExpotecnicaRubricByCategory(cat, tipo);
        if (rubric?.sections) {
          const count = rubric.sections.reduce((s, sec) => s + sec.indicators.length, 0);
          return count * 3;
        }
      }
      if (feria === "Feria Cientifica y Tecnologica") {
        return tipo === "Escrito" ? 72 : 40;
      }
      if (feria === FESTIVAL_FERIA_NAME) {
        return tipo === "Escrito" ? 0 : 12;
      }
      return 0;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const now = new Date();
    const M = PDF.MARGIN;
    const W = PDF.PAGE_W;
    const col2X = M + 8;
    const col3X = M + 90;
    const col4X = M + 120;
    const col5X = M + 148;
    const col6X = W - M;
    let y = pdfHeader(doc, "Reporte de Resultados", logoData);
    const feriaLabel = selectedFeria || "Todas las ferias";
    const isFEA = selectedFeria === FESTIVAL_FERIA_NAME || (results.length > 0 && results.every(r => {
      const p = projectsById.get(r.projectId);
      return p && p.tipo_feria === FESTIVAL_FERIA_NAME;
    }));

    const infoLines = [
      `Feria: ${feriaLabel}`,
      `Total de proyectos: ${results.length}`,
      `Total de jueces participantes: ${usersById.size}`,
      `Total evaluaciones: ${evaluations.length}`,
      `Generado: ${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR")}`
    ];
    y = pdfInfoBox(doc, infoLines, y);

    // === TABLE 1: Ranking de proyectos ===
    y = pdfSubHeader(doc, "Ranking de proyectos", y);

    // Para FEA mostrar solo Puntaje, para dual mostrar Expo + Escrito
    const dualCols = !isFEA;
    const rankLabels = dualCols
      ? ["#", "Proyecto", "Expo", "Escrito", "Puntaje", "Estado"]
      : ["#", "Proyecto", "Puntaje", "Estado"];
    const rankPositions = dualCols
      ? [ M, { x: col2X }, { x: col3X }, { x: col4X }, { x: col5X, align: "right" }, { x: col6X, align: "right" } ]
      : [ M, { x: col2X }, { x: col5X, align: "right" }, { x: col6X, align: "right" } ];

    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(M, y - 2, W - 2 * M, 6, 1, 1, "F");
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    rankLabels.forEach((l, i) => {
      const pos = rankPositions[i];
      doc.text(l, pos.x || pos, y + 1.5, pos.align ? { align: pos.align } : undefined);
    });
    y += 8;

    let rowIndex = 0;
    results.forEach((r, idx) => {
      const isFirst = idx === 0;
      y = pdfCheckPage(doc, y, 7);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...PDF.ROW_ALT);
        doc.rect(M, y - 2, W - 2 * M, 6, "F");
      }

      // 1er lugar: fondo dorado + borde superior e inferior
      if (isFirst) {
        doc.setFillColor(...PDF.GOLD_LIGHT);
        doc.rect(M, y - 2, W - 2 * M, 6, "F");
        doc.setDrawColor(...PDF.GOLD);
        doc.setLineWidth(0.6);
        doc.line(M, y - 2, W - M, y - 2);
        doc.line(M, y + 4, W - M, y + 4);
      }

      const totalVoted = r.expoVoted + r.escritoVoted;
      let stateText = "Incompleta";
      let stateColor = PDF.WARNING;
      if (totalVoted === 0) {
        stateText = "Sin evaluar";
        stateColor = PDF.MUTED;
      } else if (r.evalComplete) {
        stateText = "Completa";
        stateColor = PDF.SUCCESS;
      }

      doc.setTextColor(...PDF.INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      doc.text(isFirst ? "#1" : String(idx + 1), M, y + 0.5);
      doc.text(r.projectName, col2X, y + 0.5);

      if (dualCols) {
        // Feria con Expo + Escrito
        const expoMax = getMaxScoreForProject(r.projectId, "Exposición");
        const escritoMax = getMaxScoreForProject(r.projectId, "Escrito");
        const expoScore = r.expoTotal > 0 && r.expoVoted > 0 ? Math.round(r.expoAvg) : "—";
        const escritoScore = r.escritoTotal > 0 && r.escritoVoted > 0 ? Math.round(r.escritoAvg) : "—";
        doc.text(`${expoScore}/${expoMax}`, col3X, y + 0.5);
        doc.text(`${escritoScore}/${escritoMax}`, col4X, y + 0.5);
        doc.setFont("helvetica", "bold");
        if (r.evalComplete) {
          doc.setTextColor(...PDF.INK);
          doc.text(`${Math.round(r.finalScore)}`, col5X, y + 0.5, { align: "right" });
        } else {
          doc.setTextColor(...PDF.MUTED);
          doc.text("N/A", col5X, y + 0.5, { align: "right" });
        }
      } else {
        // FEA: puntaje único
        const score = r.expoTotal > 0 && r.expoVoted > 0 ? Math.round(r.expoAvg) : 0;
        const maxScore = getMaxScoreForProject(r.projectId, "Exposición");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...PDF.INK);
        doc.text(`${score}/${maxScore}`, col5X, y + 0.5, { align: "right" });
      }

      // Estado
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...stateColor);
      doc.text(stateText, col6X, y + 0.5, { align: "right" });
      y += 6;
      rowIndex++;
    });

    doc.setDrawColor(...PDF.BORDER);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF.PRIMARY);
    doc.text("PUNTAJE MAS ALTO:", M, y);
    const topScoreText = results[0]?.evalComplete
      ? `${Math.round(results[0].finalScore)} pts`
      : "N/A";
    doc.text(`${topScoreText} — ${results[0]?.projectName ?? ""}`, M + 45, y);
    y += 8;

    // === TABLE 2: Detalle de jueces por proyecto ===
    y = pdfSubHeader(doc, "Detalle de jueces por proyecto", y);

    for (const r of results) {
      const totalJudgeRows = r.expoJudges.length + r.escritoJudges.length;
      y = pdfCheckPage(doc, y, 22 + totalJudgeRows * 7);
      y = pdfProjectHeader(doc, r.projectName, y);

      const jLabels = ["Juez", "Tipo", "Puntaje", "Estado"];
      const jPos = [M, { x: M + 80 }, { x: M + 125 }, { x: col6X, align: "right" }];
      doc.setFillColor(...PDF.GOLD);
      doc.roundedRect(M, y - 1, W - 2 * M, 5, 0.8, 0.8, "F");
      doc.setTextColor(...PDF.WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      jLabels.forEach((l, i) => {
        const pos = jPos[i];
        doc.text(l, pos.x || pos, y + 1, pos.align ? { align: pos.align } : undefined);
      });
      y += 7;

      const allJudgeEntries = [
        ...r.expoJudges.map((j) => ({ ...j, tipo: "Exposición" })),
        ...r.escritoJudges.map((j) => ({ ...j, tipo: "Escrito" }))
      ];

      rowIndex = 0;
      for (const entry of allJudgeEntries) {
        y = pdfCheckPage(doc, y, 7);
        if (rowIndex % 2 === 1) {
          doc.setFillColor(...PDF.ROW_ALT);
          doc.rect(M, y - 2, W - 2 * M, 6, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...PDF.INK);
        doc.text(entry.judgeName, M, y + 0.5);
        doc.text(entry.tipo, M + 80, y + 0.5);
        const scoreText = entry.voted ? String(Math.round(entry.sum)) : "—";
        doc.setTextColor(...(entry.voted ? PDF.INK : PDF.MUTED));
        doc.text(scoreText, M + 125, y + 0.5);
        const statusText = entry.voted ? "Votó" : "Pendiente";
        doc.setTextColor(...(entry.voted ? PDF.SUCCESS : PDF.WARNING));
        doc.setFont("helvetica", "bold");
        doc.text(statusText, col6X, y + 0.5, { align: "right" });
        y += 6;
        rowIndex++;
      }

      // Evaluación incompleta: mostrar jueces faltantes por tipo
      const expoMissing = r.expoTotal - r.expoVoted;
      const escritoMissing = r.escritoTotal - r.escritoVoted;
      const hasIncompleteExpo = !isFEA && r.expoTotal > 0 && expoMissing > 0;
      const hasIncompleteEscrito = !isFEA && r.escritoTotal > 0 && escritoMissing > 0;
      const hasIncompleteFEA = isFEA && r.expoTotal > 0 && expoMissing > 0;

      if (hasIncompleteExpo || hasIncompleteEscrito || hasIncompleteFEA) {
        const missingParts = [];
        if (hasIncompleteExpo) missingParts.push(`${expoMissing} juez${expoMissing !== 1 ? "es" : ""} de Exposición`);
        if (hasIncompleteEscrito) missingParts.push(`${escritoMissing} juez${escritoMissing !== 1 ? "es" : ""} de Escrito`);
        if (hasIncompleteFEA) missingParts.push(`${expoMissing} juez${expoMissing !== 1 ? "es" : ""} del FEA`);
        doc.setDrawColor(...PDF.WARNING);
        doc.setFillColor(255, 249, 237);
        doc.roundedRect(M, y - 1, W - 2 * M, 5.5, 1, 1, "FD");
        doc.setTextColor(...PDF.WARNING);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`Evaluación incompleta — Faltan: ${missingParts.join(", ")}`, M + 3, y + 2.5);
        y += 7;
      }

      // Totals for this project
      doc.setDrawColor(...PDF.BORDER);
      doc.setLineWidth(0.4);
      doc.line(M, y, W - M, y);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF.PRIMARY);
      const expoMax = getMaxScoreForProject(r.projectId, "Exposición");
      const escritoMax = getMaxScoreForProject(r.projectId, "Escrito");
      const expoAvgRound = r.expoJudges.length ? Math.round(r.expoJudges.reduce((s, j) => s + j.sum, 0) / r.expoJudges.length) : 0;
      const escritoAvgRound = r.escritoJudges.length ? Math.round(r.escritoJudges.reduce((s, j) => s + j.sum, 0) / r.escritoJudges.length) : 0;
      const finalDisplay = r.evalComplete ? `${Math.round(r.finalScore)} pts` : "N/A";

      if (isFEA) {
        doc.text(`Puntaje: ${expoAvgRound}/${expoMax}`, M, y + 0.5);
      } else {
        doc.text(`Expo: ${expoAvgRound}/${expoMax} | Escrito: ${escritoAvgRound}/${escritoMax} | Final: ${finalDisplay}`, M, y + 0.5);
      }
      y += 8;

      // Separador visual entre proyectos
      if (results.indexOf(r) < results.length - 1) {
        doc.setDrawColor(...PDF.BORDER);
        doc.setLineWidth(0.6);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(M, y + 2, W - M, y + 2);
        doc.setLineDashPattern([], 0);
        y += 5;
      }
    }

    // === Summary ===
    y = pdfCheckPage(doc, y, 30);
    y = pdfSubHeader(doc, "Resumen general", y);
    const totalExpoVotes = results.reduce((s, r) => s + r.expoVoted, 0);
    const totalExpoAssigned = results.reduce((s, r) => s + r.expoTotal, 0);
    const totalEscritoVotes = results.reduce((s, r) => s + r.escritoVoted, 0);
    const totalEscritoAssigned = results.reduce((s, r) => s + r.escritoTotal, 0);
    const totalVotes = totalExpoVotes + totalEscritoVotes;
    const totalAssigned = totalExpoAssigned + totalEscritoAssigned;
    const pctVotacion = totalAssigned > 0 ? Math.round(totalVotes / totalAssigned * 100) : 0;
    const completedCount = results.filter(r => r.evalComplete).length;
    const pctCompletos = results.length > 0 ? Math.round(completedCount / results.length * 100) : 0;
    const summaryLines = [
      `Total proyectos: ${results.length} (${completedCount} con evaluación completa, ${pctCompletos}%)`,
      ...(isFEA
        ? [`• Evaluados: ${totalExpoVotes} de ${totalExpoAssigned} asignaciones completadas`]
        : [
            `• Expo: ${totalExpoVotes} de ${totalExpoAssigned} asignaciones completadas`,
            `• Escrito: ${totalEscritoVotes} de ${totalEscritoAssigned} asignaciones completadas`
          ]
      ),
      `• Total: ${totalVotes} de ${totalAssigned} evaluaciones finalizadas (${pctVotacion}%)`,
      `Proyecto lider: ${results[0]?.projectName ?? "N/A"} — ${results[0]?.evalComplete ? Math.round(results[0].finalScore) + " pts" : "N/A (incompleto)"}`
    ];
    const summaryW = W - 2 * M;
    const summaryBoxH = summaryLines.length * 7 + 14;
    doc.setFillColor(...PDF.GOLD_LIGHT);
    doc.setDrawColor(...PDF.GOLD);
    doc.roundedRect(M, y, summaryW, summaryBoxH, 2.5, 2.5, "FD");
    doc.setTextColor(...PDF.PRIMARY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    summaryLines.forEach((line, i) => {
      doc.text(line, M + 5, y + 7 + i * 7);
    });

    pdfFooter(doc, now);
    const fileName = selectedFeria
      ? `resultados_${selectedFeria.replace(/\s+/g, "_")}.pdf`
      : "resultados_generales.pdf";
    doc.save(fileName);
    showToast("PDF exportado correctamente.", "success");
  } catch (err) {
    console.error("Error generating admin PDF:", err);
    showToast("No se pudo generar el PDF. Revisa la conexion e intenta de nuevo.", "error");
  }
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
        window.location.reload();
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
  const updates = { nombre, tipo_feria: tipoFeria, role_id: roleId };

  if (contrasena) {
    updates.contrasena_hash = await hashPassword(contrasena);
  }

  const { error } = await supabase.from("usuarios").update(updates).eq("id", userId);
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
              <span>Categoria PRONAFECYT</span>
              <select name="categoria_pronatecyt">
                <option value="">Selecciona una categoria</option>
                <option value="F8B - Demostraciones Cientificas y Tecnologicas">F8B - Demostraciones Cientificas y Tecnologicas</option>
                <option value="F9B - Investigacion Cientifica">F9B - Investigacion Cientifica</option>
                <option value="F10B - I+D Tecnologico">F10B - I+D Tecnologico</option>
                <option value="F11B - Quehacer Cientifico y Tecnologico">F11B - Quehacer Cientifico y Tecnologico</option>
                <option value="F12B - Sumando Experiencias Cientificas">F12B - Sumando Experiencias Cientificas</option>
                <option value="F13B - Mi Experiencia Cientifica">F13B - Mi Experiencia Cientifica</option>
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

  const pronatecytSelect = form.querySelector('select[name="categoria_pronatecyt"]');
  if (pronatecytSelect) {
    pronatecytSelect.value = String(project.categoria_pronatecyt ?? "");
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
      await refreshAdminDataView();
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
  const { error } = await supabase.from("proyectos_ferias").update(data).eq("id", projectId);
  if (error) throw error;
}

async function deleteUser(userId) {
  const { error: assignmentsError } = await supabase.from("asignaciones_jueces").delete().eq("juez_id", userId);
  if (assignmentsError) throw assignmentsError;

  const { error: evaluationsError } = await supabase.from("evaluaciones_proyectos").delete().eq("juez_id", userId);
  if (evaluationsError) throw evaluationsError;

  const { error } = await supabase.from("usuarios").delete().eq("id", userId);
  if (error) throw error;
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    bootstrapLoginPage();
  } else if (page === "judge") {
    await verifySupabaseStatus();
    await bootstrapJudgePage();
  } else if (page === "admin") {
    await verifySupabaseStatus();
    await bootstrapAdminPage();
  }
});
