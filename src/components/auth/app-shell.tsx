"use client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-rules";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { IdCard, KeyRound, LayoutList, LogOut, Mail, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, changePassword, sendPasswordResetEmail } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setAccountMenuOpen(false); }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
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

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError("新密码至少需要 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    setPasswordLoading(true);
    const { error } = await changePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (error) {
      setPasswordError(error);
      return;
    }

    toast.success("密码修改成功");
    resetPasswordForm();
    setPasswordDialogOpen(false);
  }

  async function handleForgotPassword() {
    if (!user?.email) {
      setPasswordError("当前账号没有可用于验证的邮箱");
      return;
    }

    setPasswordError("");
    setResetLoading(true);
    const { error } = await sendPasswordResetEmail(user.email);
    setResetLoading(false);

    if (error) {
      setPasswordError(error);
      return;
    }

    toast.success("验证邮件已发送，请前往邮箱继续修改密码", { duration: 10000 });
  }

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
                <LayoutList className="hidden h-4 w-4 sm:inline-block sm:mr-1.5" />
                <span className="inline">记忆库</span>
              </Button>
              <Button
                variant={isGenerateActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/generate")}
                aria-label="生成"
              >
                <Sparkles className="hidden h-4 w-4 sm:inline-block sm:mr-1.5" />
                <span className="inline">生成</span>
              </Button>
              <Button
                variant={isProfileActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push("/profile")}
                aria-label="档案"
              >
                <IdCard className="hidden h-4 w-4 sm:inline-block sm:mr-1.5" />
                <span className="inline">档案</span>
              </Button>
            </nav>
          </div>

          <div ref={accountMenuRef} className="relative shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label="账户菜单"
              title="账户菜单"
            >
              <User className="h-4 w-4" />
            </Button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</p>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    resetPasswordForm();
                    setPasswordDialogOpen(true);
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                  修改密码
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void signOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>输入原密码验证身份，或通过邮箱验证重置密码。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">原密码</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-md">
                {passwordError}
              </p>
            )}

            <DialogFooter className="items-center sm:items-center">
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                onClick={handleForgotPassword}
                disabled={resetLoading || passwordLoading}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                {resetLoading ? "发送中..." : "忘记密码？"}
              </Button>
              <Button type="submit" disabled={passwordLoading || resetLoading}>
                {passwordLoading ? "保存中..." : "保存新密码"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
