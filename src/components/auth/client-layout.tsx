"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/";

  if (isAuthPage) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
