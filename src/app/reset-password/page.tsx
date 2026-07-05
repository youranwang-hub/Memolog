"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await getSupabase().auth.getSession();
      if (error || !data.session) {
        setErrorMsg("验证链接无效或已过期，请重新发送密码重置邮件");
      }
      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("新密码至少需要 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    toast.success("密码已重置，请使用新密码登录");
    await getSupabase().auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">重置密码</CardTitle>
          <CardDescription>邮箱验证完成后，设置一个新的登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          {checkingSession ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-new-password">新密码</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  placeholder="至少6位"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">确认新密码</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-md">
                  {errorMsg}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || errorMsg.startsWith("验证链接") }>
                {loading ? "保存中..." : "保存新密码"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
