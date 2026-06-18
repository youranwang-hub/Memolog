import { getSupabase } from "@/lib/supabase";

export async function getAuthHeaders() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();

  if (!session?.access_token) {
    throw new Error("请先登录");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}
