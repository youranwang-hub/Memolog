"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { IdCard, LayoutList, LogOut, Sparkles, User } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
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

  const isMemoryActive = pathname === "/dashboard" || pathname.startsWith("/memory/");
  const isGenerateActive = pathname === "/generate";
  const isProfileActive = pathname === "/profile";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/dashboard" className="font-semibold text-sm shrink-0">
              Memolog
            </Link>
            <nav className="flex items-center gap-1">
              <Button
                variant={isMemoryActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/dashboard")}
                aria-label="记忆库"
              >
                <LayoutList className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">记忆库</span>
              </Button>
              <Button
                variant={isGenerateActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/generate")}
                aria-label="生成"
              >
                <Sparkles className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">生成</span>
              </Button>
              <Button
                variant={isProfileActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/profile")}
                aria-label="档案"
              >
                <IdCard className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">档案</span>
              </Button>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm" className="max-w-[140px] sm:max-w-none">
                <User className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">{user.email}</span>
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
