"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const code = new URLSearchParams(window.location.search).get("code");
    
      const result = code
        ? await getSupabase().auth.exchangeCodeForSession(code)
        : await getSupabase().auth.getSession();
    
      if (result.error) {
        console.error("Callback session error:", result.error);
        return;
      }
    
      if (result.data.session) {
        window.location.replace("/dashboard");
  }
}
    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">正在验证你的邮箱...</p>
      </div>
    </div>
  );
}
