import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import handler from "../api/cron-daily-results-pdf.js";

const originalFetch = globalThis.fetch;
const originalCronSecret = process.env.CRON_SECRET;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSecretKey = process.env.SUPABASE_SECRET_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    CRON_SECRET: originalCronSecret,
    SUPABASE_URL: originalSupabaseUrl,
    SUPABASE_SECRET_KEY: originalSecretKey
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("daily PDF cron fails closed if CRON_SECRET is not configured", async () => {
  delete process.env.CRON_SECRET;
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; };
  const response = createResponse();

  await handler({ method: "GET", headers: { authorization: "Bearer something" } }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(fetchCalled, false);
});

test("daily PDF cron rejects invalid authorization without accessing Supabase", async () => {
  process.env.CRON_SECRET = "configured-test-value";
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; };
  const response = createResponse();

  await handler({ method: "GET", headers: { authorization: "Bearer wrong" } }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalled, false);
});

test("daily PDF cron uses server-only credentials and returns a sanitized batch result", async () => {
  process.env.CRON_SECRET = "configured-test-value";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_server_only";
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/rest/v1/rpc/list_pending_daily_results_pdf_archives");
    assert.equal(options.headers.apikey, "sb_secret_server_only");
    assert.deepEqual(JSON.parse(options.body), { p_limit: 14 });
    return new Response("[]", { status: 200 });
  };
  const response = createResponse();

  await handler({
    method: "GET",
    headers: { authorization: "Bearer configured-test-value" }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { pending: 0, processed: [], failed: [], skipped: [] });
  assert.equal(JSON.stringify(response.body).includes("sb_secret_"), false);
});

test("daily PDF cron allows GET only", async () => {
  const response = createResponse();

  await handler({ method: "POST", headers: {} }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "GET");
});
