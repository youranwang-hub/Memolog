import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "登录状态已失效，请重新登录" }, { status: 401 }),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}

export function checkRateLimit(key: string) {
  const now = Date.now();
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
