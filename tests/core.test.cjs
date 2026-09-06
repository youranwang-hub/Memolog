/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS loader for local TypeScript tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Compile only local TypeScript modules under test; no production loader changes.
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  module._compile(output.outputText, filename);
};
const { normalizeEventDate, validateDateRange, parseEventDay } = require("../src/lib/dates.ts");
const { validateMemory, normalizeTags, MAX_TAGS } = require("../src/lib/memory-validation.ts");
const valid = { title: "志愿服务", content: "参与社区图书整理", category: "生活", result: "", emotion: "neutral", emotion_note: "", tags: ["社区"], event_date: "未知", event_date_end: null };
test("unknown dates stay unknown; leap days and Chinese month precision are preserved", () => {
  assert.equal(normalizeEventDate("未知"), "未知");
  assert.equal(normalizeEventDate(""), "未知");
  assert.equal(normalizeEventDate("2024年2月29日"), "2024-02-29");
  assert.equal(normalizeEventDate("2026年6月"), "2026-06");
  for (const value of ["2026-02-29", "2026-02-31", "2026-13-01", "2026-00-02", "2026-01-00"]) {
    assert.equal(normalizeEventDate(value), "未知");
    assert.equal(parseEventDay(value), null);
  }
});
test("date ranges reject reversed or impossible dates without inventing missing days", () => {
  assert.throws(() => validateDateRange("2026-08", "2026-07"));
  assert.throws(() => validateDateRange("未知", "2026-08"));
  assert.throws(() => validateDateRange("2026-02-31", null));
  assert.doesNotThrow(() => validateDateRange("2026-08-20", "2026-08"));
});
test("AI payloads reject malformed types, unsupported categories and empty content", () => {
  assert.equal(validateMemory(valid).event_date, "未知");
  for (const change of [{ tags: "社区" }, { tags: [42] }, { emotion: "invented" }, { content: " " }, { event_date: 0 }, { event_date_end: {} }]) {
    assert.throws(() => validateMemory({ ...valid, ...change }));
  }
  assert.throws(() => validateMemory(valid, ["项目"]));
  assert.deepEqual(validateMemory({ ...valid, user_id: "other-user", id: "injected" }), valid);
});
test("tag cleanup deduplicates after trimming and enforces shared limits", () => {
  assert.deepEqual(normalizeTags([" 社区 ", "社区", ""]), ["社区"]);
  assert.equal(normalizeTags(Array.from({ length: 20 }, (_, i) => String(i))).length, MAX_TAGS);
  assert.equal(normalizeTags(["a".repeat(30)])[0].length, 16);
});
test("DeepSeek validates responses and passes cancellation signal", async () => {
  const { chat } = require("../src/lib/deepseek.ts");
  const originalFetch = global.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, "https://api.deepseek.com/v1/chat/completions");
      assert.ok(options.signal);
      return { ok: true, json: async () => ({ choices: [{ message: { content: "整理结果" } }] }) };
    };
    assert.equal(await chat({ systemPrompt: "test", userPrompt: "test" }), "整理结果");
    global.fetch = async () => ({ ok: true, json: async () => ({ choices: [] }) });
    await assert.rejects(chat({ systemPrompt: "test", userPrompt: "test" }), /返回内容为空/);
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(chat({ systemPrompt: "test", userPrompt: "test" }), /429/);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = originalKey;
  }
});

test("shared quota denies exhausted users and does not fail open on database errors", async () => {
  const { checkRateLimit } = require("../src/lib/api-auth.ts");
  assert.equal(await checkRateLimit("extract:test", { rpc: async () => ({ data: true, error: null }) }), null);
  assert.equal((await checkRateLimit("extract:test", { rpc: async () => ({ data: false, error: null }) })).status, 429);
  assert.equal((await checkRateLimit("extract:test", { rpc: async () => ({ error: { code: "network" } }) })).status, 503);
});
test("local fallback expires counters and enforces the per-user request limit", async () => {
  const { checkRateLimit } = require("../src/lib/api-auth.ts");
  const originalNow = Date.now;
  try {
    Date.now = () => 1000000;
    for (let i = 0; i < 20; i++) assert.equal(await checkRateLimit("extract:fallback-test"), null);
    assert.equal((await checkRateLimit("extract:fallback-test")).status, 429);
    Date.now = () => 1060001;
    assert.equal(await checkRateLimit("extract:fallback-test"), null);
  } finally { Date.now = originalNow; }
});

test("server auth verifies the request bearer and separates outages from expired credentials", async () => {
  const { requireUser } = require("../src/lib/api-auth.ts");
  const oldFetch = global.fetch;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const request = new Request("http://localhost/api", { headers: { Authorization: "Bearer test-user-token" } });
  try {
    global.fetch = async (url, options) => {
      assert.equal(new Headers(options.headers).get("Authorization"), "Bearer test-user-token");
      return new Response(JSON.stringify({ id: "test-user", aud: "authenticated", created_at: "2026-01-01T00:00:00Z" }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    assert.equal((await requireUser(request)).user.id, "test-user");
    global.fetch = async () => new Response(JSON.stringify({ msg: "bad jwt", code: "bad_jwt" }), { status: 403 });
    assert.equal((await requireUser(request)).error.status, 401);
    global.fetch = async () => new Response(JSON.stringify({ msg: "service unavailable" }), { status: 503 });
    const outage = (await requireUser(request)).error;
    assert.equal(outage.status, 503);
    assert.equal((await outage.json()).code, "AUTH_UNAVAILABLE");
  } finally {
    global.fetch = oldFetch;
    for (const [name, value] of [["NEXT_PUBLIC_SUPABASE_URL", oldUrl], ["NEXT_PUBLIC_SUPABASE_ANON_KEY", oldKey]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
test("client retries an expired bearer once, but never refreshes on service outages", async () => {
  const supabase = require("../src/lib/supabase.ts");
  const originalClient = supabase.getSupabase;
  const originalFetch = global.fetch;
  let refreshed = 0;
  let sends = 0;
  supabase.getSupabase = () => ({ auth: {
    getSession: async () => ({ data: { session: { access_token: refreshed ? "new-token" : "old-token" } } }),
    refreshSession: async () => { refreshed++; return { data: { session: { access_token: "new-token" } }, error: null }; },
  } });
  const { fetchWithAuth } = require("../src/lib/api-client.ts");
  try {
    global.fetch = async (url, options) => {
      sends++;
      assert.equal(new Headers(options.headers).get("Authorization"), sends === 1 ? "Bearer old-token" : "Bearer new-token");
      return new Response("{}", { status: sends === 1 ? 401 : 200 });
    };
    assert.equal((await fetchWithAuth("/api/deepseek/extract", { method: "POST", body: "{}" })).status, 200);
    assert.equal(refreshed, 1);
    assert.equal(sends, 2);
    global.fetch = async () => new Response("{}", { status: 503 });
    assert.equal((await fetchWithAuth("/api/deepseek/extract")).status, 503);
    assert.equal(refreshed, 1);
  } finally { supabase.getSupabase = originalClient; global.fetch = originalFetch; }
});
