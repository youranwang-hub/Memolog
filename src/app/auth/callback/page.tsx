"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
export default function AuthCallbackPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        const result = code ? await getSupabase().auth.exchangeCodeForSession(code) : await getSupabase().auth.getSession();
        if (result.error || !result.data.session) throw new Error("验证链接无效或已过期，请返回登录页重新操作。");
        if (active) window.location.replace("/dashboard");
      } catch { if (active) setError("验证未完成，请检查网络或重新获取验证邮件。"); }
    }
    void verify();
    return () => { active = false; };
  }, []);
  return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center space-y-4">
    <p role={error ? "alert" : "status"}>{error || "正在验证你的邮箱…"}</p>
    {error && <Link href="/" className="underline">返回登录</Link>}
  </div></div>;
}
