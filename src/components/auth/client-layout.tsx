"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { AppShell } from "@/components/auth/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";

const APP_SCHEME = "memolog-youran:";

function handleNativeAuthUrl(url: string) {
  try {
    const incomingUrl = new URL(url);

    if (incomingUrl.protocol !== APP_SCHEME) return;

    // memolog-youran://auth/callback → /auth/callback
    // memolog-youran://reset-password → /reset-password
    const path = `/${incomingUrl.host}${incomingUrl.pathname}`;

    if (path !== "/auth/callback" && path !== "/reset-password") return;

    window.location.replace(`${path}${incomingUrl.search}${incomingUrl.hash}`);
  } catch {
    console.error("无法处理 App 登录回调链接");
  }
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: { remove: () => Promise<void> } | undefined;

    void App.getLaunchUrl().then((result) => {
      if (result?.url) handleNativeAuthUrl(result.url);
    });

    void App.addListener("appUrlOpen", ({ url }) => {
      handleNativeAuthUrl(url);
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      void listener?.remove();
    };
  }, []);

  const isPublicPage =
    pathname === "/" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/");

  if (isPublicPage) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}