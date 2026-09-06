import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
let warnedAboutMigration = false;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getAuthToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

export function getAuthedSupabase(request: Request) {
  const token = getAuthToken(request);
  if (!token) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

export async function requireUser(request: Request) {
  const supabase = getAuthedSupabase(request);
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "请先登录" }, { status: 401 }),
      supabase: null,
      user: null,
    };
  }

  let result;
  try {
    // A server request has no browser session; verify its explicit bearer token.
    result = await supabase.auth.getUser(getAuthToken(request)!);
  } catch {
    return { error: NextResponse.json({ error: "暂时无法连接登录验证服务，请稍后重试，无需退出登录", code: "AUTH_UNAVAILABLE" }, { status: 503 }), supabase: null, user: null };
  }
  const { data: { user }, error } = result;

  if (error && ![400, 401, 403].includes(error.status ?? 0)) {
    console.warn("Auth verification unavailable", { name: error.name, status: error.status });
    return { error: NextResponse.json({ error: "暂时无法连接登录验证服务，请稍后重试，无需退出登录", code: "AUTH_UNAVAILABLE" }, { status: 503 }), supabase: null, user: null };
  }

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "登录状态已失效，请重新登录", code: "AUTH_EXPIRED" }, { status: 401 }),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}

export async function checkRateLimit(key: string, supabase?: SupabaseClient) {
  if (supabase) {
    const { data, error } = await supabase.rpc("consume_ai_quota", { p_action: key.split(":")[0] });
    if (!error) return data === true ? null : NextResponse.json({ error: "请求太频繁，请稍后再试" }, { status: 429 });
    if (error.code !== "PGRST202" && error.code !== "42883") return NextResponse.json({ error: "暂时无法验证请求额度，请稍后重试" }, { status: 503 });
    if (!warnedAboutMigration) { console.warn("Shared AI quota migration is not installed; using instance-local limit."); warnedAboutMigration = true; }
  }
  const now = Date.now();
  for (const [id, entry] of rateLimitBuckets) {
    if (entry.resetAt <= now) rateLimitBuckets.delete(id);
  }
  if (!rateLimitBuckets.has(key) && rateLimitBuckets.size >= 10000) {
    return NextResponse.json({ error: "服务繁忙，请稍后再试" }, { status: 429 });
  }
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: "请求太频繁，请稍后再试" }, { status: 429 });
  }

  bucket.count += 1;
  return null;
}
