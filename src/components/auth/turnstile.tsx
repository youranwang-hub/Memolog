"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "light" | "dark" | "auto" }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptId = "cloudflare-turnstile";

export function Turnstile({ onVerify, onExpire }: { onVerify: (token: string) => void; onExpire: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetRef.current) return;
      widgetRef.current = window.turnstile.render(containerRef.current, { sitekey: siteKey, callback: onVerify, "expired-callback": onExpire, "error-callback": onExpire, theme: "auto" });
    };
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [onExpire, onVerify, siteKey]);

  if (!siteKey) return <p className="text-sm text-destructive">注册验证暂未配置，请稍后再试。</p>;
  return <div ref={containerRef} className="min-h-[65px]" aria-label="人机验证" />;
}
