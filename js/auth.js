import { supabase } from "./supabase.js?v=1";
import { normalizeRoleName, showToast, setupHideOnScroll, openModalAccesible, closeModalAccesible, fetchAllRpc } from "./utils.js?v=16.11";
import { generateJudgePDF } from "./pdf.js?v=3.22";
import { clearSessionCache } from "./cache.js?v=3.28";
import { icon } from "./icons.js?v=1";

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
    clearSessionCache();
}

export async function restoreAppSession() {
    const user = getSession();
    if (!user?.session_token) return false;

    try {
        const { data, error } = await supabase.rpc("restore_session", {
            p_session_token: user.session_token
        });

        if (error) {
            sessionStorage.removeItem(SESSION_KEY);
            return false;
        }

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
        sessionStorage.removeItem(SESSION_KEY);
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

        showLogoutModal(user);
    });
}

export function showLogoutModal(user) {
    const existing = document.getElementById("logout-modal");
    if (existing) existing.remove();

    const isJudge = normalizeRoleName(user?.role) === "Juez";
    const title = isJudge ? "¿Quieres cerrar tu sesión?" : "¿Cerrar sesión de administración?";
    const description = isJudge
        ? "Descarga tu reporte de evaluaciones antes de salir o cierra sesión directamente."
        : "Tu sesión se cerrará y tendrás que iniciar sesión de nuevo para volver al panel.";
    const downloadAction = isJudge
        ? `<button class="btn-modal btn-modal-pdf" id="modal-download-btn">${icon("file-arrow-down", 16)}<span>Descargar reporte</span></button>`
        : "";

    const overlay = document.createElement("div");
    overlay.id = "logout-modal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" aria-describedby="logout-modal-description">
      <div class="modal-icon-wrap" aria-hidden="true">
        ${icon("sign-out", 28)}
      </div>
      <h3 class="modal-title" id="logout-modal-title">${title}</h3>
      <p class="modal-desc" id="logout-modal-description">${description}</p>
      <div class="modal-actions">
        ${downloadAction}
        <button class="btn-modal btn-modal-danger" id="modal-logout-btn">Cerrar sesión</button>
        <button class="btn-modal btn-modal-secondary" id="modal-cancel-btn">Cancelar</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
    openModalAccesible(overlay);

    const dismiss = () => {
        closeModalAccesible(overlay);
        overlay.remove();
    };

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            dismiss();
        }
    });

    document.getElementById("modal-cancel-btn").addEventListener("click", dismiss);

    document.getElementById("modal-logout-btn").addEventListener("click", async() => {
        dismiss();
        await clearSession();
        window.location.href = "/index.html";
    });

    if (!isJudge) return;

    document.getElementById("modal-download-btn").addEventListener("click", async() => {
        const btn = document.getElementById("modal-download-btn");
        btn.disabled = true;
        btn.textContent = "Verificando...";

        const evalCheck = await fetchAllRpc("get_judge_evaluations_with_titles", {
            p_session_token: user.session_token
        });

        if (!evalCheck || evalCheck.length === 0) {
            showToast("No tienes evaluaciones guardadas para exportar. Puedes cerrar sesión sin descargar.", "info");
            btn.disabled = false;
            btn.innerHTML = `${icon("file-arrow-down", 16)}<span>Descargar reporte</span>`;
            return;
        }

        btn.textContent = "Generando PDF...";
        try {
            await generateJudgePDF(user);
        } catch (e) {
            console.error("Error generating PDF:", e);
            showToast("No se pudo generar el PDF. Revisa la conexión e intenta de nuevo.", "error");
            btn.disabled = false;
            btn.innerHTML = `${icon("file-arrow-down", 16)}<span>Descargar reporte</span>`;
            return;
        }
        dismiss();
        await clearSession();
        window.location.href = "/index.html";
    });
}



// ponytail: pre-hash SHA-256 cliente -> servidor aplica bcrypt (extensions.crypt) via lazy_bcrypt_migration.sql
// No añadir salt cliente: servidor maneja sal bf10 y migracion lazy desde contrasena_hash.
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

export async function enforceRole(requiredRole) {
  const restored = await restoreAppSession();
  const user = getSession();
  const normalizedRequiredRole = normalizeRoleName(requiredRole);

  if (!restored || !user) {
    window.location.href = "/index.html";
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
    window.location.href = "/juez.html";
    return;
  }

  if (sessionRole === "administrador") {
    window.location.href = "/usuarios.html";
    return;
  }

  const form = document.querySelector("[data-login-form]");
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
      showToast("Completa usuario y contraseña.", "error");
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
        showToast("Error de conexion. Recarga la pagina e intenta de nuevo.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.user_id) {
        showToast("Usuario o contrasena incorrectos.", "error");
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      clearSessionCache();
      saveSession({
        id: result.user_id,
        nombre: result.user_name,
        role: normalizeRoleName(result.user_role),
        tipo_feria: result.user_feria ?? null,
        session_token: result.session_token
      });

      if (normalizeRoleName(result.user_role) === "Juez") {
        window.location.href = "/juez.html";
        return;
      }

      if (normalizeRoleName(result.user_role) === "administrador") {
        window.location.href = "/usuarios.html";
        return;
      }

      showToast(`Rol no soportado para redireccion: ${result.user_role}.`, "error");
    } catch {
      showToast("No se pudo iniciar sesion.", "error");
    }

    btn.disabled = false;
    btn.textContent = originalText;
  });
}
