"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/auth/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname.startsWith("/auth/");

  if (isPublicPage) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
