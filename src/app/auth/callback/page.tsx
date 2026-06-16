"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const { data, error } = await getSupabase().auth.getSession();
      if (error) {
        console.error("Callback session error:", error);
      }
      if (data.session) {
        window.location.href = "/dashboard";
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
