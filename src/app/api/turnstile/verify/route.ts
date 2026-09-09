import { NextResponse } from "next/server";

const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function POST(request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "注册验证暂未配置" }, { status: 503 });
  try {
    const { token } = await request.json();
    if (typeof token !== "string" || !token) return NextResponse.json({ error: "请先完成人机验证" }, { status: 400 });
    const body = new FormData();
    body.set("secret", secret);
    body.set("response", token);
    const response = await fetch(verifyUrl, { method: "POST", body, cache: "no-store" });
    if (!response.ok) throw new Error(`Turnstile returned ${response.status}`);
    const result = await response.json() as { success?: boolean };
    if (!result.success) return NextResponse.json({ error: "人机验证未通过，请重试" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return NextResponse.json({ error: "人机验证暂时不可用，请稍后重试" }, { status: 503 });
  }
}
