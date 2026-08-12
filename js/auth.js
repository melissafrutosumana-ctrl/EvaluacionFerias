import { supabase } from "./supabase.js";
import { normalizeRoleName, showToast, setMessage, setupHideOnScroll } from "./utils.js";

export const SESSION_KEY = "ef_user_session";

export function getSession() {
    try {
        const value = sessionStorage.getItem(SESSION_KEY);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

export function saveSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export async function clearSession() {
    const user = getSession();
    if (user?.session_token) {
        try {
            await supabase.rpc("logout_session", { p_session_token: user.session_token });
        } catch { /* ignore */ }
    }
    sessionStorage.removeItem(SESSION_KEY);
}

export async function restoreAppSession() {
    const user = getSession();
    if (!user?.session_token) return false;

    try {
        const { data, error } = await supabase.rpc("restore_session", {
            p_session_token: user.session_token
        });

        if (error) return false;

        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.user_id) {
            sessionStorage.removeItem(SESSION_KEY);
            return false;
        }

        saveSession({
            id: result.user_id,
            nombre: result.user_name,
            role: normalizeRoleName(result.user_role),
            tipo_feria: result.user_feria ?? null,
            session_token: user.session_token
        });
        return true;
    } catch {
        return false;
    }
}

export function bindLogout() {
    const link = document.querySelector("[data-logout-link]");

    if (!link) {
        return;
    }

    link.addEventListener("click", async(event) => {
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
    if (window.jspdf ?.jsPDF) return Promise.resolve();
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = () => {
            if (window.jspdf ?.jsPDF) resolve();
            else reject(new Error("jsPDF not found after load"));
        };
        s.onerror = () => reject(new Error("Failed to load jspdf library"));
        document.head.appendChild(s);
    });
    return jspdfPromise;
}

let mepLogoPromise = null;
async function loadMEPLogo() {
    if (window._mepLogoData) return window._mepLogoData;
    if (mepLogoPromise) return mepLogoPromise;
    mepLogoPromise = (async() => {
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
    MARGIN: 18,
    PAGE_W: 210,
    PAGE_LIMIT: 272,
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
    const headerH = 28;
    doc.setDrawColor(...PDF.PRIMARY);
    doc.setFillColor(...PDF.PRIMARY);
    doc.roundedRect(PDF.MARGIN, y - 5, PDF.PAGE_W - 2 * PDF.MARGIN, headerH, 2, 2, "F");

    const logoX = PDF.MARGIN + 4;
    const headerTextY = y;

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", logoX, headerTextY - 1, 38, 11);
        } catch (e) {
            console.warn("Error al añadir logo MEP:", e);
        }
    }

    const textX = PDF.MARGIN + 46;
    doc.setTextColor(...PDF.WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Ministerio de Educacion Publica", textX, headerTextY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Direccion Regional de Educacion Central del Pacifico", textX, headerTextY + 12);
    doc.text("Sistema de Evaluacion de Ferias Institucionales", textX, headerTextY + 17.5);

    y += headerH + 7;
    doc.setDrawColor(...PDF.GOLD);
    doc.setLineWidth(0.8);
    doc.line(PDF.MARGIN, y, PDF.PAGE_W - PDF.MARGIN, y);
    y += 9;

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

export function showLogoutModal(user) {
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

    document.getElementById("modal-download-btn").addEventListener("click", async() => {
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



export async function hashPassword(password) {
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

export async function passwordMatches(inputPassword, storedPassword) {
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

export async function enforceRole(requiredRole) {
  const restored = await restoreAppSession();
  const user = getSession();
  const normalizedRequiredRole = normalizeRoleName(requiredRole);

  if (!user) {
    window.location.href = "index.html";
    return null;
  }

  const normalizedSessionRole = normalizeRoleName(user.role);

  if (normalizedSessionRole !== normalizedRequiredRole) {
    showToast(`Acceso denegado: esta pagina es solo para ${normalizedRequiredRole}.`, "error");
    return null;
  }

  const normalizedUser = { ...user, role: normalizedSessionRole };

  return normalizedUser;
}

export async function bootstrapLoginPage() {
  await supabase.auth.signOut().catch(() => {});
  setupHideOnScroll();
  await restoreAppSession();
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
      setMessage(status, "Completa usuario y contrasena.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Ingresando...";

    try {
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase.rpc("authenticate_user", {
        p_username: usuario,
        p_password_hash: passwordHash
      });

      if (error) {
        setMessage(status, "Error de conexion. Recarga la pagina e intenta de nuevo.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.user_id) {
        setMessage(status, "Usuario o contrasena incorrectos.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      saveSession({
        id: result.user_id,
        nombre: result.user_name,
        role: normalizeRoleName(result.user_role),
        tipo_feria: result.user_feria ?? null,
        session_token: result.session_token
      });

      if (normalizeRoleName(result.user_role) === "Juez") {
        window.location.href = "evaluaciones.html";
        return;
      }

      if (normalizeRoleName(result.user_role) === "administrador") {
        window.location.href = "Proyectos.html";
        return;
      }

      setMessage(status, `Rol no soportado para redireccion: ${result.user_role}.`, "error");
    } catch {
      setMessage(status, "No se pudo iniciar sesion.", "error");
    }

    btn.disabled = false;
    btn.textContent = originalText;
  });
}
