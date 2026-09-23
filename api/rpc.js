import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const SESSION_COOKIE = "__Host-ef_session";

const ALLOWED_RPCS = new Set([
  "admin_delete_project",
  "admin_delete_user",
  "admin_insert_user",
  "admin_save_assignments",
  "admin_save_project",
  "admin_set_manual_escrito",
  "admin_update_user",
  "authenticate_user",
  "delete_judge_evaluation_draft",
  "get_assignments",
  "get_evaluations",
  "get_evaluations_since",
  "get_judge_evaluation_draft",
  "get_judge_evaluations",
  "get_judge_evaluations_with_titles",
  "get_judge_observation",
  "get_judge_projects",
  "get_project",
  "get_projects",
  "get_observations",
  "get_roles",
  "get_users",
  "logout_session",
  "restore_session",
  "save_evaluations_batch",
  "save_judge_evaluation_draft",
  "save_observation"
]);

function readCookie(request, name) {
  const cookies = request.cookies;
  if (cookies && Object.hasOwn(cookies, name)) return cookies[name];

  const cookieHeader = request.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;

  const protocol = request.headers["x-forwarded-proto"]?.split(",")[0].trim() || "https";
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

function setSessionCookie(response, token) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

function withSessionToken(params, token) {
  return { ...params, p_session_token: token };
}

function getClientIpHash(request, secretKey) {
  const forwardedIp = request.headers["x-vercel-forwarded-for"];
  if (typeof forwardedIp !== "string") return null;

  const clientIp = forwardedIp.trim();
  if (isIP(clientIp) === 0) return null;

  return createHmac("sha256", secretKey).update(clientIp).digest("hex");
}

function stripSessionToken(data) {
  const scrub = (row) => {
    if (!row || typeof row !== "object") return row;
    const safeRow = { ...row };
    delete safeRow.session_token;
    return safeRow;
  };
  return Array.isArray(data) ? data.map(scrub) : scrub(data);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Cookie, Origin");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método no permitido." });
    return;
  }

  if (!isSameOrigin(request) || request.headers["x-app-request"] !== "1") {
    response.status(403).json({ error: "Origen no permitido." });
    return;
  }

  if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    response.status(415).json({ error: "Se requiere application/json." });
    return;
  }

  const body = request.body && typeof request.body === "object" ? request.body : null;
  const functionName = body?.functionName;
  const suppliedParams = body?.params;
  if (typeof functionName !== "string" || !ALLOWED_RPCS.has(functionName)
    || !suppliedParams || typeof suppliedParams !== "object" || Array.isArray(suppliedParams)) {
    response.status(400).json({ error: "Solicitud RPC no válida." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const isLogin = functionName === "authenticate_user";
  if (!supabaseUrl || !publishableKey) {
    response.status(500).json({ error: "Falta la configuración pública de Supabase." });
    return;
  }
  if (isLogin && !secretKey?.startsWith("sb_secret_")) {
    response.status(503).json({ error: "El inicio de sesión no está configurado de forma segura." });
    return;
  }

  const cookieToken = readCookie(request, SESSION_COOKIE);
  const isLegacyMigration = functionName === "restore_session" && !cookieToken
    && typeof suppliedParams.p_session_token === "string";
  const sessionToken = cookieToken ?? (isLegacyMigration ? suppliedParams.p_session_token : null);

  if (!isLogin && !sessionToken) {
    response.status(401).json({ error: "La sesión no es válida." });
    return;
  }

  const clientIpHash = isLogin ? getClientIpHash(request, secretKey) : null;
  if (isLogin && !clientIpHash) {
    response.status(503).json({ error: "No se pudo validar el origen del inicio de sesión." });
    return;
  }

  const params = isLogin
    ? { ...suppliedParams, p_client_ip_hash: clientIpHash }
    : withSessionToken(suppliedParams, sessionToken);
  delete params.session_token;
  if (isLogin) delete params.p_session_token;

  const upstreamApiKey = isLogin ? secretKey : publishableKey;
  const upstreamHeaders = { apikey: upstreamApiKey, "Content-Type": "application/json" };
  if (!upstreamApiKey.startsWith("sb_publishable_") && !upstreamApiKey.startsWith("sb_secret_")) {
    upstreamHeaders.Authorization = `Bearer ${upstreamApiKey}`;
  }
  if (request.headers.range) upstreamHeaders.Range = request.headers.range;
  if (request.headers["range-unit"]) upstreamHeaders["Range-Unit"] = request.headers["range-unit"];

  let upstreamResponse;
  try {
    const endpoint = new URL(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, supabaseUrl);
    upstreamResponse = await fetch(endpoint, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(params)
    });
  } catch {
    response.status(502).json({ error: "No se pudo conectar con Supabase." });
    return;
  }

  const rawResult = await upstreamResponse.text();
  let data;
  try {
    data = rawResult ? JSON.parse(rawResult) : null;
  } catch {
    response.status(502).json({ error: "Supabase devolvió una respuesta no válida." });
    return;
  }

  if (!upstreamResponse.ok) {
    if (upstreamResponse.status === 401 && cookieToken) clearSessionCookie(response);
    response.status(upstreamResponse.status).json({ error: data?.message ?? "La solicitud RPC falló." });
    return;
  }

  if (isLogin) {
    const loginResult = Array.isArray(data) ? data[0] : data;
    if (loginResult?.user_id && typeof loginResult.session_token === "string" && loginResult.session_token) {
      setSessionCookie(response, loginResult.session_token);
    } else if (loginResult?.user_id) {
      response.status(502).json({ error: "No se pudo iniciar la sesión de forma segura." });
      return;
    }
    data = stripSessionToken(data);
  } else if (isLegacyMigration) {
    const restoreResult = Array.isArray(data) ? data[0] : data;
    if (restoreResult?.user_id) setSessionCookie(response, sessionToken);
  } else if (functionName === "restore_session") {
    const restoreResult = Array.isArray(data) ? data[0] : data;
    if (!restoreResult?.user_id) clearSessionCookie(response);
  }

  if (functionName === "logout_session") clearSessionCookie(response);
  if (upstreamResponse.status === 204) {
    response.status(204).end();
    return;
  }
  response.status(upstreamResponse.status).json({ data });
}
