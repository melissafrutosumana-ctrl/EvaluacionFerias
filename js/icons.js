const ICON_PATHS = {
  users: '<path d="M117.25 157.92a60 60 0 1 0-66.5 0A95.83 95.83 0 0 0 3.53 195.63a8 8 0 1 0 13.4 8.74 80 80 0 0 1 134.14 0 8 8 0 0 0 13.4-8.74 95.83 95.83 0 0 0-47.22-37.71ZM40 108a44 44 0 1 1 44 44 44.05 44.05 0 0 1-44-44Zm210.14 98.7a8 8 0 0 1-11.07-2.33A79.83 79.83 0 0 0 172 168a8 8 0 0 1 0-16 44 44 0 1 0-16.34-84.87 8 8 0 1 1-5.94-14.85 60 60 0 0 1 55.53 105.64 95.83 95.83 0 0 1 47.22 37.71 8 8 0 0 1-2.33 11.07Z"/>',
  folder: '<path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16ZM40 56h52.69l16 16H40Zm176 144H40V88h176Z"/>',
  "clipboard-text": '<path d="M168 152a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-8-40H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16Zm56-64v168a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h36.26a47.92 47.92 0 0 1 71.48 0H200a16 16 0 0 1 16 16ZM96 64h64a32 32 0 0 0-64 0Zm104-16h-26.75A47.93 47.93 0 0 1 176 64v8a8 8 0 0 1-8 8H88a8 8 0 0 1-8-8v-8a47.93 47.93 0 0 1 2.75-16H56v168h144Z"/>',
  trophy: '<path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16ZM48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128Zm40-15.1a24 24 0 0 1-24 24h-.5a81.81 81.81 0 0 0 .5-8.9V80h24Z"/>',
  "chart-bar": '<path d="M224 200h-8V40a8 8 0 0 0-8-8h-56a8 8 0 0 0-8 8v40H96a8 8 0 0 0-8 8v40H48a8 8 0 0 0-8 8v64h-8a8 8 0 0 0 0 16h192a8 8 0 0 0 0-16ZM160 48h40v152h-40Zm-56 48h40v104h-40Zm-48 48h32v56H56Z"/>',
  "chat-text": '<path d="M216 48H40a16 16 0 0 0-16 16v160a15.85 15.85 0 0 0 9.24 14.5A16.13 16.13 0 0 0 40 240a15.89 15.89 0 0 0 10.25-3.78l.09-.07L83 208h133a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16ZM40 224V64h176v128H80a8 8 0 0 0-5.23 1.95L40 224Zm48-112a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16H96a8 8 0 0 1-8-8Zm0 32a8 8 0 0 1 8-8h64a8 8 0 1 1 0 16H96a8 8 0 0 1-8-8Z"/>',
  funnel: '<path d="M230.6 49.53A15.81 15.81 0 0 0 216 40H40a16 16 0 0 0-11.81 26.76l.08.09L96 139.17v76.83a16 16 0 0 0 24.87 13.32l32-21.34A16 16 0 0 0 160 194.66v-55.49l67.74-72.32.08-.09a15.8 15.8 0 0 0 2.78-17.23ZM40 56h176l-69.84 74.58A8 8 0 0 0 144 136v58.66L112 216v-80a8 8 0 0 0-2.16-5.47Z"/>',
  "user-plus": '<path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8Zm-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17ZM108 152a52 52 0 1 0-52-52 52.06 52.06 0 0 0 52 52Z"/>',
  "folder-plus": '<path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16ZM92.69 56l16 16H40V56Zm123.31 144H40V88h176Zm-88-88a8 8 0 0 1 8 8v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 8-8Z"/>',
  "file-arrow-down": '<path d="M213.66 82.34 157.66 26.34A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31 188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48Zm-42.34-61.66a8 8 0 0 1 0 11.32l-24 24a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L120 164.69V120a8 8 0 0 1 16 0v44.69l10.34-10.35a8 8 0 0 1 11.32 0Z"/>',
  "floppy-disk": '<path d="M219.31 72 184 36.69A15.86 15.86 0 0 0 172.69 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V83.31A15.86 15.86 0 0 0 219.31 72ZM168 208H88v-56h80Zm40 0h-24v-56a16 16 0 0 0-16-16H88a16 16 0 0 0-16 16v56H48V48h124.69L208 83.31ZM160 72a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h56a8 8 0 0 1 8 8Z"/>',
  "magnifying-glass": '<path d="M229.66 218.34 179.59 168.28a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32ZM40 112a72 72 0 1 1 72 72 72.08 72.08 0 0 1-72-72Z"/>',
  shield: '<path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19 23.06 18.86 46 25.27 47 25.53a8 8 0 0 0 4.2 0c1-.26 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16Zm0 72c0 37.07-13.66 67.16-40.6 89.42A129.3 129.3 0 0 1 128 223.62a128.25 128.25 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160Z"/>',
  clock: '<path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8Z"/>',
  calendar: '<path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16ZM72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160Zm-96-88v64a8 8 0 0 1-16 0v-51.06l-4.42 2.22a8 8 0 0 1-7.16-14.32l16-8A8 8 0 0 1 112 120Zm59.16 30.45L152 176h16a8 8 0 0 1 0 16h-32a8 8 0 0 1-6.4-12.8l28.78-38.37A8 8 0 1 0 145.07 132a8 8 0 1 1-13.85-8A24 24 0 0 1 176 136a23.76 23.76 0 0 1-4.84 14.45Z"/>',
  "list-checks": '<path d="M224 128a8 8 0 0 1-8 8h-88a8 8 0 0 1 0-16h88a8 8 0 0 1 8 8ZM128 72h88a8 8 0 0 0 0-16h-88a8 8 0 0 0 0 16Zm88 112h-88a8 8 0 0 0 0 16h88a8 8 0 0 0 0-16ZM82.34 42.34 56 68.69 45.66 58.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32Zm0 64L56 132.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32Zm0 64L56 196.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32Z"/>',
  "sign-out": '<path d="M120 216a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16H56v160h56a8 8 0 0 1 8 8Zm109.66-93.66-40-40a8 8 0 0 0-11.32 11.32L204.69 120H112a8 8 0 0 0 0 16h92.69l-26.35 26.34a8 8 0 0 0 11.32 11.32l40-40a8 8 0 0 0 0-11.32Z"/>',
  trash: '<path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z"/>',
  pencil: '<path d="m227.31 73.37-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69A15.86 15.86 0 0 0 104 219.31L227.31 96a16 16 0 0 0 0-22.63ZM51.31 160 136 75.31 152.69 92 68 176.68ZM48 179.31 76.69 208H48Zm48 25.38L79.31 188 164 103.31 180.69 120Zm96-96L147.31 64l24-24L216 84.68Z"/>',
  "check-circle": '<path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0ZM232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88Z"/>',
  "warning-circle": '<path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0Zm20 36a12 12 0 1 1-12-12 12 12 0 0 1 12 12Z"/>',
  "x-circle": '<path d="m165.66 101.66-26.35 26.34 26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32ZM232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88Z"/>',
  "file-text": '<path d="M213.66 82.34 157.66 26.34A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31 188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48Zm-32-80a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Z"/>',
  "download": '<path d="M240 136v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h40a8 8 0 0 1 0 16H32v64h192v-64h-40a8 8 0 0 1 0-16h40a16 16 0 0 1 16 16Zm-117.66-2.34a8 8 0 0 0 11.32 0l48-48a8 8 0 0 0-11.32-11.32L136 108.69V24a8 8 0 0 0-16 0v84.69L85.66 74.34a8 8 0 0 0-11.32 11.32Z"/>',
};

export function icon(name, size = 20, className = "") {
  const path = ICON_PATHS[name];
  if (!path) return "";
  const classes = ["app-icon", className].filter(Boolean).join(" ");
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" data-icon-family="phosphor">${path}</svg>`;
}

function contextIconName(element) {
  const markup = element.innerHTML.toLowerCase();
  const link = element.closest(".quick-nav-link");
  const heading = element.closest(".card-header")?.querySelector("h2")?.textContent.toLowerCase() || "";
  const buttonText = element.closest("button")?.textContent.toLowerCase() || "";

  if (element.classList.contains("voted-icon")) return "check-circle";
  if (element.classList.contains("pending-icon")) return "clock";
  if (element.closest(".observaciones-empty-state")) return "file-text";
  if (element.closest(".identity-bar") && document.body.dataset.page === "judge") return "shield";

  if (link) {
    const label = link.textContent.toLowerCase();
    if (label.includes("usuario")) return "users";
    if (label.includes("proyecto")) return "folder";
    if (label.includes("asign")) return "clipboard-text";
    if (label.includes("resultado")) return "trophy";
    if (label.includes("observacion")) return "chat-text";
  }

  if (element.closest(".feria-filter-bar")) return "funnel";
  if (heading.includes("agregar usuario")) return "user-plus";
  if (heading.includes("agregar") && heading.includes("proyecto")) return "folder-plus";
  if (heading.includes("usuario")) return "users";
  if (heading.includes("proyecto")) return "folder";
  if (heading.includes("asignacion") || heading.includes("jueces registrados")) return "clipboard-text";
  if (heading.includes("puntaje") || heading.includes("resultado")) return "chart-bar";
  if (heading.includes("observacion")) return "chat-text";
  if (heading.includes("progreso")) return "chart-bar";
  if (heading.includes("fecha")) return "calendar";
  if (heading.includes("categoria")) return "list-checks";
  if (buttonText.includes("exportar") || buttonText.includes("descargar")) return "file-arrow-down";
  if (buttonText.includes("guardar")) return "floppy-disk";
  if (buttonText.includes("editar")) return "pencil";
  if (buttonText.includes("eliminar") || buttonText.includes("borrar")) return "trash";

  if (markup.includes("m16 21v-2a4 4 0 0 0-4-4h6") || markup.includes("m16 21v-2a4 4 0 0 0-4-4h6")) return "users";
  if (markup.includes("m6 14 1.5-2.9")) return "folder";
  if (markup.includes("rect width=\"8\" height=\"4\"")) return "clipboard-text";
  if (markup.includes("m10 14.66")) return "trophy";
  if (markup.includes("m3 3v16")) return "chart-bar";
  if (markup.includes("m4 22v4")) return "funnel";
  if (markup.includes("m12 15v3")) return "file-arrow-down";
  if (markup.includes("m15.2 3")) return "floppy-disk";
  if (markup.includes("m11 4h4")) return "pencil";
  if (markup.includes("m3 6h18")) return "trash";
  if (markup.includes("circle cx=\"11\"")) return "magnifying-glass";
  if (markup.includes("m12 6v6")) return "clock";
  if (markup.includes("m20 13c0 5")) return "shield";
  if (markup.includes("m14 2h6")) return "file-text";
  if (markup.includes("m9 21h5")) return "sign-out";
  return "";
}

function upgradeInlineIcons(root) {
  root.querySelectorAll("svg:not([data-icon-family='phosphor'])").forEach((element) => {
    const name = contextIconName(element);
    if (!name) return;
    const size = Number.parseInt(element.getAttribute("width") || "20", 10) || 20;
    const className = element.getAttribute("class") || "";
    element.outerHTML = icon(name, size, className);
  });
}

export function initIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    const size = Number(element.dataset.iconSize || 20);
    element.innerHTML = icon(element.dataset.icon, size, element.dataset.iconClass || "");
  });

  upgradeInlineIcons(root);

  if (root === document && !document.body.dataset.iconObserver) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          upgradeInlineIcons(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.body.dataset.iconObserver = "true";
  }
}

if (typeof document !== "undefined") {
  const bootIcons = () => initIcons();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootIcons, { once: true });
  } else {
    bootIcons();
  }
}
