import { supabase } from "./supabase.js";

export const FERIA_TYPES = ["Feria Cientifica y Tecnologica", "Feria Expotecnica", "Festival Estudiantil de las Artes"];
export const FESTIVAL_FERIA_NAME = "Festival Estudiantil de las Artes";
export const FESTIVAL_CATEGORIES = ["Artes Visuales", "Artes Literarias", "Artes Digitales", "Artes Musicales", "Artes Escenicas"];
export const FESTIVAL_SUBCATEGORIES = {
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
export const EXPOTECNICA_CATEGORIES = ["DESAFIO STEAM", "EMPRENDIMIENTO E INNOVACION"];

export const PRONAFECYT_BY_NIVEL = {
    "Primaria (I y II Ciclos)": [
        "F11B - Quehacer Científico y Tecnológico"
    ],
    "Secundaria - III Ciclo": [
        "F8B - Demostraciones Científicas y Tecnológicas",
        "F9B - Investigación Científica",
        "F10B - Investigación y Desarrollo Tecnológico"
    ],
    "Secundaria - Ed. Diversificada": [
        "F9B - Investigación Científica",
        "F10B - Investigación y Desarrollo Tecnológico"
    ],
    "Educación Especial": [
        "F12B - Sumando Experiencias Científicas",
        "F13B - Mi Experiencia Científica"
    ]
};

export function getNivelFromPronatecyt(categoria) {
    if (!categoria) return null;
    const code = String(categoria).split(" ")[0];
    if (["F11B", "F11C"].includes(code)) return "Primaria (I y II Ciclos)";
    if (["F8B", "F8C"].includes(code)) return "Secundaria - III Ciclo";
    if (["F9B", "F9C", "F10B", "F10C"].includes(code)) return "Secundaria - Ed. Diversificada";
    if (["F12B", "F12C", "F13B"].includes(code)) return "Educación Especial";
    return null;
}

export const PRONAFECYT_CATEGORIES = [
    "F8B - Demostraciones Científicas y Tecnológicas",
    "F9B - Investigación Científica",
    "F10B - Investigación y Desarrollo Tecnológico",
    "F11B - Quehacer Científico y Tecnológico",
    "F12B - Sumando Experiencias Científicas",
    "F13B - Mi Experiencia Científica"
];

// Máximos oficiales del PDF: B (Jueces/Exposición) y C (Comité/Escrito)
export const PRONAFECYT_CODE_MAX = {
    F8B: 40, F8C: 64,
    F9B: 40, F9C: 78,
    F10B: 40, F10C: 98,
    F11B: 40, F11C: 54,
    F12B: 40, F12C: 54,
    F13B: 100
};

// Máximo real (indicadores × 3) de cada formulario C del escrito.
// Se usa para normalizar: un escrito "lleno" siempre vale 50% del total.
export const PRONAFECYT_C_RAW_MAX = {
    F8C: 78, F9C: 90, F10C: 87, F11C: 75, F12C: 72
};

export const EXPOTECNICA_EJES = [
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

export function showToast(message, type = "info") {
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

export function showSkeleton(container, rows = 4) {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < rows; i++) {
        const div = document.createElement("div");
        div.className = "skeleton skeleton-row";
        container.appendChild(div);
    }
}



export function normalizeRoleName(roleName) {
    const normalized = String(roleName ?? "").trim().toLowerCase();

    if (normalized === "juez") {
        return "Juez";
    }

    if (normalized === "admin" || normalized === "administrador") {
        return "administrador";
    }

    return String(roleName ?? "").trim();
}

export function setMessage(target, text, kind = "info") {
    if (!target) {
        return;
    }

    target.textContent = text;
    target.dataset.kind = kind;
}

export function isMissingColumnError(error, columnPrefix) {
    const message = String(error ?.message ?? "").toLowerCase();
    const missingColumnSignals = [
        "does not exist",
        "could not find",
        "schema cache"
    ];

    return missingColumnSignals.some((signal) => message.includes(signal)) && message.includes(columnPrefix.toLowerCase());
}

export function updateProjectFormFieldsByFeria(projectForm) {
    if (!projectForm) {
        return;
    }

    const feriaInput = projectForm.querySelector('[name="tipo_feria"]');
    const sections = projectForm.querySelectorAll("[data-feria-section]");
    const selectedFeria = String(feriaInput ?.value ?? "");

    sections.forEach((section) => {
        const sectionFeria = String(section.dataset.feriaSection ?? "");
        const isActive = sectionFeria === selectedFeria;
        section.hidden = !isActive;
    });

    const isFestival = selectedFeria === FESTIVAL_FERIA_NAME;
    const isExpotecnica = selectedFeria === "Feria Expotecnica";

    const festivalCategorySelect = projectForm.querySelector('select[name="categoria_festival"]');
    const festivalSubcategorySelect = projectForm.querySelector('select[name="subcategoria_festival"]');
    const festivalCategoryValue = String(festivalCategorySelect ?.value ?? "");
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
    const expoCategoryValue = String(expotecnicaCategorySelect ?.value ?? "");
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
    const nivelSelect = projectForm.querySelector('[data-nivel-cientifico-select]');
    const pronatecytSelect = projectForm.querySelector('[data-pronatecyt-select], select[name="categoria_pronatecyt"]');
    const pronatecytCatWrap = projectForm.querySelector('[data-pronafecyt-cat-wrap]');

    if (isScientific) {
        if (nivelSelect) nivelSelect.required = true;
        const nivelValue = nivelSelect ? nivelSelect.value : "";
        const nivelForms = PRONAFECYT_BY_NIVEL[nivelValue] ?? [];
        const hasNivel = nivelForms.length > 0;
        if (pronatecytCatWrap) pronatecytCatWrap.hidden = !hasNivel;
        if (pronatecytSelect && hasNivel) {
            const prevVal = pronatecytSelect.value;
            pronatecytSelect.innerHTML = [
                '<option value="">Selecciona un formulario</option>',
                ...nivelForms.map((f) => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`)
            ].join("");
            if (nivelForms.includes(prevVal)) pronatecytSelect.value = prevVal;
        }
        if (pronatecytSelect) pronatecytSelect.required = hasNivel;
    } else {
        if (nivelSelect) {
            nivelSelect.required = false;
            nivelSelect.value = "";
        }
        if (pronatecytSelect) {
            pronatecytSelect.required = false;
            pronatecytSelect.value = "";
        }
        if (pronatecytCatWrap) pronatecytCatWrap.hidden = true;
    }
}

export function fillSelect(select, items, placeholder, valueKey = "id", labelKey = "nombre") {
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

export function fillSelectGroupedByTipo(select, items, evaluatedKeys = new Set()) {
    if (!select) return;
    select.innerHTML = "";

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = evaluatedKeys.size ?
        `Selecciona un proyecto (${evaluatedKeys.size} evaluados)` :
        "Selecciona un proyecto asignado";
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

export function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function setupHamburgerMenu() {
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

export function setupHideOnScroll() {
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

export function highlightActiveNavLink() {
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

export function buildFeriaOptions(selectedValue = "") {
    return FERIA_TYPES.map(
        (value) => `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`
    ).join("");
}

export function renderJudgeRubric(indicators, scoreOptions = null) {
    const tbody = document.querySelector("[data-rubric-body]");
    const headRow = document.querySelector(".rubric-table thead tr");

    if (!tbody) {
        return;
    }

    const hasPerIndicatorMax = indicators.some((item) => typeof item === "object" && item.text && typeof item.max === "number");

    if (headRow) {
        if (hasPerIndicatorMax) {
            headRow.innerHTML = "<th>Indicadores a evaluar</th><th>Puntaje</th>";
        } else {
            const options = scoreOptions && scoreOptions.length ?
                scoreOptions : [
                    { value: 3, label: "3" },
                    { value: 2, label: "2" },
                    { value: 1, label: "1" },
                    { value: 0, label: "0" }
                ];
            headRow.innerHTML = [
                "<th>Indicadores a evaluar</th>",
                ...options.map((item) => `<th>${escapeHTML(item.label)}</th>`)
            ].join("");
        }
    }

    if (!indicators.length) {
        tbody.innerHTML = `<tr><td colspan="6">No hay indicadores configurados para esta feria.</td></tr>`;
        return;
    }

    const rows = [];
    let globalIndex = 0;

    indicators.forEach((item) => {
        if (item && typeof item === "object" && item.section) {
            rows.push(`<tr class="rubric-section"><td colspan="6"><strong>${escapeHTML(item.section)}</strong></td></tr>`);
            return;
        }

        const text = typeof item === "string" ? item : (item?.text ?? "");
        const max = typeof item === "string" ? 3 : (item?.max ?? 3);
        const fieldName = `indicador_${globalIndex}`;

        if (hasPerIndicatorMax) {
            const radios = [];
            for (let v = max; v >= 0; v--) {
                radios.push(`<label class="rubric-radio-label rubric-radio-inline"><input type="radio" name="${fieldName}" value="${v}" ${v === max ? "required" : ""}><span>${v}</span></label>`);
            }
            rows.push(`<tr><td>${escapeHTML(text)}</td><td><div class="rubric-radios">${radios.join("")}</div></td></tr>`);
        } else {
            const options = scoreOptions && scoreOptions.length ?
                scoreOptions : [
                    { value: 3, label: "3" },
                    { value: 2, label: "2" },
                    { value: 1, label: "1" },
                    { value: 0, label: "0" }
                ];
            const cells = options
                .map(
                    (opt, oi) => `<td><label class="rubric-radio-label"><input type="radio" name="${fieldName}" value="${opt.value}" ${oi === 0 ? "required" : ""} aria-label="${escapeHTML(text)} - ${escapeHTML(opt.label)}"></label></td>`
                )
                .join("");
            rows.push(`<tr><td>${escapeHTML(text)}</td>${cells}</tr>`);
        }

        globalIndex++;
    });

    tbody.innerHTML = rows.join("");
}
