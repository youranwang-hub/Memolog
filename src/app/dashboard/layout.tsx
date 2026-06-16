"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutList, Sparkles } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/";
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-sm">
              Memolog
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <LayoutList className="h-4 w-4 mr-1.5" />
                记忆库
              </Button>
              <Button
                variant={pathname === "/generate" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/generate")}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                生成
              </Button>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
