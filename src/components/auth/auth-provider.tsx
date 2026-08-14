"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { getAuthRedirectUrl } from "@/lib/mobile-auth";

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
    getSupabase().auth.getSession().then(({ data: { session }, error }) => {
      console.log("[Auth] getSession:", { hasSession: !!session, userId: session?.user?.id, error: error?.message });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      console.log("[Auth] onAuthStateChange:", event, { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[Auth] signIn called:", email);
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    console.log("[Auth] signIn result:", { hasSession: !!data.session, userId: data.user?.id, error: error?.message });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log("[Auth] signUp called:", email);
    const { error, data } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });
    console.log("[Auth] signUp result:", { userId: data.user?.id, identities: data.user?.identities?.length, error: error?.message });
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
      });
      if (verifyError) return { error: "原密码不正确，请重新输入" };

      const { error } = await getSupabase().auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      return {};
    },
    [user?.email]
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
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
