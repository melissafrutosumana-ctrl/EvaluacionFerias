import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import handler from "../api/rpc.js";
import { supabase } from "../js/supabase.js";

const originalFetch = globalThis.fetch;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalPublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const originalSecretKey = process.env.SUPABASE_SECRET_KEY;

function request(body, overrides = {}) {
  return {
    method: "POST",
    headers: {
      origin: "https://app.example",
      host: "app.example",
      "x-forwarded-proto": "https",
      "x-app-request": "1",
      "content-type": "application/json",
      ...overrides.headers
    },
    cookies: overrides.cookies ?? {},
    body
  };
}

function response() {
  return {
    headers: {},
    code: 200,
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
    end() { this.ended = true; return this; }
  };
}

function setup() {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = `sb_publishable_${crypto.randomUUID()}`;
  process.env.SUPABASE_SECRET_KEY = `sb_secret_${crypto.randomUUID()}`;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;
  if (originalPublishableKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
  if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
});

test("the browser RPC adapter removes session tokens before sending requests", async () => {
  const token = crypto.randomUUID();
  let sentBody;
  globalThis.fetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  const result = await supabase.rpc("get_projects", { p_session_token: token });

  assert.deepEqual(result, { data: [], error: null });
  assert.equal("p_session_token" in sentBody.params, false);
});

test("the browser sends a legacy token only for the one-time restore migration", async () => {
  const token = crypto.randomUUID();
  let sentBody;
  globalThis.fetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  await supabase.rpc("restore_session", { p_session_token: token });

  assert.equal(sentBody.functionName, "restore_session");
  assert.equal(sentBody.params.p_session_token, token);
});

test("the browser adapter accepts a successful RPC with an empty 204 response", async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });

  const result = await supabase.rpc("admin_set_manual_escrito", { p_project_id: 1, p_score: 10 });

  assert.deepEqual(result, { data: null, error: null });
});

test("session metadata storage strips a token supplied by any caller", async () => {
  const values = new Map();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      setItem(key, value) { values.set(key, value); },
      getItem(key) { return values.get(key) ?? null; }
    }
  });

  try {
    const { saveSession, SESSION_KEY } = await import("../js/auth.js");
    const token = crypto.randomUUID();
    saveSession({ id: 1, role: "Juez", session_token: token });
    const stored = values.get(SESSION_KEY);

    assert.equal(stored.includes(token), false);
    assert.deepEqual(JSON.parse(stored), { id: 1, role: "Juez" });
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, "sessionStorage", previousStorage);
    else delete globalThis.sessionStorage;
  }
});

test("login stores the session token only in an HttpOnly cookie and omits it from JSON", async () => {
  setup();
  const token = crypto.randomUUID();
  globalThis.fetch = async (_url, options) => {
    const sentBody = JSON.parse(options.body);
    assert.equal(sentBody.p_password_hash, "hashed-password");
    assert.match(sentBody.p_client_ip_hash, /^[a-f0-9]{64}$/);
    assert.equal(options.headers.apikey, process.env.SUPABASE_SECRET_KEY);
    return new Response(JSON.stringify([{
      user_id: 21,
      user_name: "Juez",
      user_role: "Juez",
      session_token: token
    }]), { status: 200 });
  };
  const result = response();

  await handler(request({
    functionName: "authenticate_user",
    params: { p_username: "juez", p_password_hash: "hashed-password" }
  }, { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }), result);

  assert.match(result.headers["Set-Cookie"], /__Host-ef_session=/);
  assert.match(result.headers["Set-Cookie"], /HttpOnly/);
  assert.match(result.headers["Set-Cookie"], /Secure/);
  assert.match(result.headers["Set-Cookie"], /SameSite=Strict/);
  assert.equal(JSON.stringify(result.payload).includes(token), false);
  assert.equal("session_token" in result.payload.data[0], false);
});

test("protected RPCs replace a submitted token with the HttpOnly cookie token", async () => {
  setup();
  const cookieToken = crypto.randomUUID();
  const submittedToken = crypto.randomUUID();
  let sentParams;
  globalThis.fetch = async (_url, options) => {
    sentParams = JSON.parse(options.body);
    assert.equal(options.headers.apikey, process.env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal("Authorization" in options.headers, false);
    return new Response(JSON.stringify([]), { status: 200 });
  };
  const result = response();

  await handler(request({
    functionName: "get_projects",
    params: { p_session_token: submittedToken }
  }, { cookies: { "__Host-ef_session": cookieToken } }), result);

  assert.equal(sentParams.p_session_token, cookieToken);
  assert.equal(JSON.stringify(result.payload).includes(cookieToken), false);
});

test("a request without a session cookie is rejected before reaching Supabase", async () => {
  setup();
  let calledSupabase = false;
  globalThis.fetch = async () => { calledSupabase = true; };
  const result = response();

  await handler(request({ functionName: "get_projects", params: {} }), result);

  assert.equal(result.code, 401);
  assert.equal(calledSupabase, false);
});

test("void RPCs preserve the upstream 204 response without adding a body", async () => {
  setup();
  globalThis.fetch = async () => new Response(null, { status: 204 });
  const result = response();

  await handler(request({ functionName: "admin_set_manual_escrito", params: { p_project_id: 1 } }, {
    cookies: { "__Host-ef_session": crypto.randomUUID() }
  }), result);

  assert.equal(result.code, 204);
  assert.equal(result.ended, true);
  assert.equal(result.payload, null);
});

test("the one-time legacy migration sets a cookie only after restore_session succeeds", async () => {
  setup();
  const token = crypto.randomUUID();
  globalThis.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).p_session_token, token);
    return new Response(JSON.stringify([{
      user_id: 21,
      user_name: "Juez",
      user_role: "Juez",
      user_feria: null
    }]), { status: 200 });
  };
  const result = response();

  await handler(request({
    functionName: "restore_session",
    params: { p_session_token: token }
  }), result);

  assert.match(result.headers["Set-Cookie"], /HttpOnly/);
  assert.equal(JSON.stringify(result.payload).includes(token), false);
});

test("requests from another origin and unlisted RPCs are rejected", async (t) => {
  setup();
  let calledSupabase = false;
  globalThis.fetch = async () => { calledSupabase = true; };

  await t.test("cross-origin request", async () => {
    const result = response();
    await handler(request({ functionName: "get_projects", params: {} }, {
      headers: { origin: "https://attacker.example" }
    }), result);
    assert.equal(result.code, 403);
  });

  await t.test("unlisted function", async () => {
    const result = response();
    await handler(request({ functionName: "arbitrary_function", params: {} }), result);
    assert.equal(result.code, 400);
  });

  assert.equal(calledSupabase, false);
});

test("the admin SQL migration rejects missing or non-admin roles in every overload", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sql = await readFile(path.join(root, "sql/security_require_valid_admin_session.sql"), "utf8");

  assert.equal((sql.match(/IF v_role IS DISTINCT FROM 'administrador'/g) ?? []).length, 7);
  assert.doesNotMatch(sql, /IF\s+v_role\s*(?:!=|<>)\s*'administrador'/i);
  assert.equal((sql.match(/SET search_path TO 'pg_catalog', 'public'/g) ?? []).length, 7);
});
