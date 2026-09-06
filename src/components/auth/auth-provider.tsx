"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; success?: boolean }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  changePassword: async () => ({}),
  sendPasswordResetEmail: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password }).catch(() => ({ error: { message: "登录失败，请检查网络后重试" } }));
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error, data } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    }).catch(() => ({ data: { user: null }, error: { message: "注册失败，请检查网络后重试" } }));
    if (error) return { error: error.message };

    if (data.user?.identities?.length === 0) {
      return { error: "该邮箱已注册，请直接登录" };
    }
    return { success: true };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const email = user?.email;
      if (!email) return { error: "当前账号没有可用于验证的邮箱" };

      const { error: verifyError } = await getSupabase().auth.signInWithPassword({
        email,
        password: currentPassword,
      }).catch(() => ({ error: { message: "验证失败，请检查网络" } }));
      if (verifyError) return { error: "原密码不正确，请重新输入" };

      const { error } = await getSupabase().auth.updateUser({ password: newPassword }).catch(() => ({ error: { message: "修改失败，请检查网络后重试" } }));
      if (error) return { error: error.message };
      return {};
    },
    [user?.email]
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }).catch(() => ({ error: { message: "发送失败，请检查网络后重试" } }));
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut().catch(() => ({ error: new Error("退出失败") }));
    if (error) { toast.error("退出失败，请重试"); return; }
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, changePassword, sendPasswordResetEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
