"use client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-rules";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Turnstile } from "@/components/auth/turnstile";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const { user, loading: authLoading, signIn, signUp, sendPasswordResetEmail } = useAuth();
  const clearTurnstileToken = useCallback(() => setTurnstileToken(""), []);

  // Already signed in -> redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = "/dashboard";
    }
  }, [authLoading, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error);
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } else {
      if (!turnstileToken) {
        setErrorMsg("请先完成人机验证");
        setLoading(false);
        return;
      }
      const verification = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!verification.ok) {
        const data = await verification.json().catch(() => ({}));
        setErrorMsg(data.error || "人机验证未通过，请重试");
        setTurnstileToken("");
        setLoading(false);
        return;
      }
      const { error, success } = await signUp(email, password);
      if (error) {
        setErrorMsg(error);
      } else if (success) {
        toast.success("注册成功！请查看邮箱确认链接", { duration: 10000 });
        setIsLogin(true);
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    setErrorMsg("");

    if (!email) {
      setErrorMsg("请先输入邮箱");
      return;
    }

    setResetLoading(true);
    const { error } = await sendPasswordResetEmail(email);
    setResetLoading(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    toast.success("验证邮件已发送，请前往邮箱继续修改密码", { duration: 10000 });
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render form if already signed in (will redirect)
  if (user) return null;

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen p-4">
      <Card className="auth-paper">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Memolog</CardTitle>
          <CardDescription>记录、整理和复用你的经历。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isLogin && <Turnstile onVerify={setTurnstileToken} onExpire={clearTurnstileToken} />}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">密码</Label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                    onClick={handleForgotPassword}
                    disabled={resetLoading || loading}
                  >
                    {resetLoading ? "发送中..." : "忘记密码？"}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="至少6位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-md">
                {errorMsg}
              </p>
            )}

            <Button type="submit" className="w-full h-10" disabled={loading || resetLoading}>
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "还没有账号？" : "已有账号？"}
            <button
              type="button"
              className="ml-1 underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
                setTurnstileToken("");
              }}
            >
              {isLogin ? "注册" : "登录"}
            </button>
          </p>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            注册即表示你已阅读并同意 <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">隐私与 AI 使用说明</a>。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
