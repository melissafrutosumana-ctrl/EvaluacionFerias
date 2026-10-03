import { supabase } from "./supabase.js?v=4";
import { normalizeRoleName, showToast, setupHideOnScroll, openModalAccesible, closeModalAccesible, fetchAllRpc } from "./utils.js?v=16.17";
import { generateJudgePDF } from "./pdf.js?v=3.33";
import { CACHE_SCOPE, clearSessionCache } from "./cache.js?v=3.30";
import { icon } from "./icons.js?v=1";

export const SESSION_KEY = "ef_user_session";
const JUDGE_FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc9qUgsb-5mksdTvjs8buJcOG095FCaDfi60E7szDLC_UIxLw/viewform";
const JUDGE_FEEDBACK_PROMPTED_PREFIX = "judge-feedback-prompted:v1:";
const judgeFeedbackPromptedInMemory = new Set();

export function getSession() {
    try {
        const value = sessionStorage.getItem(SESSION_KEY);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

export function saveSession(user) {
    const safeUser = { ...user };
    delete safeUser.session_token;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
}

export async function clearSession(user = getSession()) {
    const feedbackPromptedKey = normalizeRoleName(user?.role) === "Juez" && user?.id
        ? `${JUDGE_FEEDBACK_PROMPTED_PREFIX}${user.id}`
        : null;

    try {
        await supabase.rpc("logout_session", {});
    } catch { /* ignore */ }

    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore unavailable session storage */ }

    if (feedbackPromptedKey) {
        judgeFeedbackPromptedInMemory.delete(feedbackPromptedKey);
        try {
            sessionStorage.removeItem(feedbackPromptedKey);
        } catch { /* ignore unavailable session storage */ }
    }

    clearSessionCache(CACHE_SCOPE.ALL);
}

export async function restoreAppSession() {
    const user = getSession();
    const legacyToken = user?.session_token;

    try {
        const { data, error } = await supabase.rpc("restore_session", legacyToken
            ? { p_session_token: legacyToken }
            : {});

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
            tipo_feria: result.user_feria ?? null
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

        if (normalizeRoleName(user?.role) === "Juez" && user?.id) {
            const promptedKey = `${JUDGE_FEEDBACK_PROMPTED_PREFIX}${user.id}`;
            let alreadyPrompted = judgeFeedbackPromptedInMemory.has(promptedKey);
            if (!alreadyPrompted) {
                try {
                    alreadyPrompted = sessionStorage.getItem(promptedKey) === "1";
                } catch {
                    // Storage can be unavailable; the in-memory fallback remains usable.
                }
            }

            if (!alreadyPrompted) {
                judgeFeedbackPromptedInMemory.add(promptedKey);
                try {
                    sessionStorage.setItem(promptedKey, "1");
                } catch {
                    // The in-memory marker prevents repeated prompts until this tab closes.
                }
                showJudgeFeedbackModal(user);
                return;
            }
        }

        showLogoutModal(user);
    });
}

function showJudgeFeedbackModal(user) {
    const existing = document.getElementById("judge-feedback-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "judge-feedback-modal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="judge-feedback-title" aria-describedby="judge-feedback-description">
      <h3 class="modal-title" id="judge-feedback-title">Comparte tu experiencia como juez</h3>
      <p class="modal-desc" id="judge-feedback-description">Tu opinión ayuda a mejorar el proceso de evaluación. Completar el formulario es opcional; abrirlo no cierra tu sesión.</p>
      <div class="modal-actions">
        <button class="btn-modal btn-modal-pdf" id="judge-feedback-open-btn" type="button"><span>Abrir formulario</span></button>
        <button class="btn-modal btn-modal-secondary" id="judge-feedback-later-btn" type="button">Ahora no</button>
        <button class="btn-modal btn-modal-secondary" id="judge-feedback-cancel-btn" type="button">Cancelar</button>
      </div>
    </div>
  `;

    const dismiss = () => {
        closeModalAccesible(overlay);
        overlay.remove();
    };

    document.body.appendChild(overlay);
    openModalAccesible(overlay, {
        initialFocus: overlay.querySelector("#judge-feedback-open-btn"),
        onEscape: dismiss
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) dismiss();
    });

    overlay.querySelector("#judge-feedback-cancel-btn").addEventListener("click", dismiss);
    overlay.querySelector("#judge-feedback-later-btn").addEventListener("click", () => {
        dismiss();
        showLogoutModal(user);
    });
    overlay.querySelector("#judge-feedback-open-btn").addEventListener("click", () => {
        const didOpen = openJudgeFeedbackForm();

        dismiss();
        showLogoutModal(user);
        if (!didOpen) {
            showToast("No se pudo abrir el formulario. Revisa si el navegador bloqueó la ventana.", "warning");
        }
    });
}

function openJudgeFeedbackForm() {
    let openedWindow = null;
    try {
        // A blank page gives us a handle to detach its opener before loading the external form.
        openedWindow = window.open("about:blank", "_blank");
        if (!openedWindow || openedWindow.closed) return false;

        openedWindow.opener = null;
        const referrerPolicy = openedWindow.document.createElement("meta");
        referrerPolicy.name = "referrer";
        referrerPolicy.content = "no-referrer";
        openedWindow.document.head.append(referrerPolicy);
        openedWindow.location.replace(JUDGE_FEEDBACK_FORM_URL);
        return true;
    } catch {
        try {
            openedWindow?.close();
        } catch {
            // Ignore a browser popup handle that is no longer accessible.
        }
        return false;
    }
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
        await clearSession(user);
        window.location.href = "/index.html";
    });

    if (!isJudge) return;

    document.getElementById("modal-download-btn").addEventListener("click", async() => {
        const btn = document.getElementById("modal-download-btn");
        btn.disabled = true;
        btn.textContent = "Verificando...";

        const evalCheck = await fetchAllRpc("get_judge_evaluations_with_titles");

        if (!evalCheck || evalCheck.length === 0) {
            showToast("No tienes evaluaciones guardadas para exportar. Puedes cerrar sesión sin descargar.", "info");
            btn.disabled = false;
            btn.innerHTML = `${icon("file-arrow-down", 16)}<span>Descargar reporte</span>`;
            return;
        }

        btn.textContent = "Generando PDF...";
        try {
            const generated = await generateJudgePDF(user);
            if (!generated) {
                btn.disabled = false;
                btn.innerHTML = `${icon("file-arrow-down", 16)}<span>Descargar reporte</span>`;
                return;
            }
        } catch (e) {
            console.error("Error generating PDF:", e);
            showToast("No se pudo generar el PDF. Revisa la conexión e intenta de nuevo.", "error");
            btn.disabled = false;
            btn.innerHTML = `${icon("file-arrow-down", 16)}<span>Descargar reporte</span>`;
            return;
        }
        dismiss();
        await clearSession(user);
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

      clearSessionCache(CACHE_SCOPE.ALL);
      saveSession({
        id: result.user_id,
        nombre: result.user_name,
        role: normalizeRoleName(result.user_role),
        tipo_feria: result.user_feria ?? null
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
