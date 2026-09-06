import { getSupabase } from "@/lib/supabase";
import type { GeneratedHistory, GeneratedHistoryInput } from "@/lib/types";

export const HISTORY_PAGE_SIZE = 20;
export async function fetchGeneratedHistories(type: string, offset = 0, signal?: AbortSignal) {
  let query = getSupabase()
    .from("generated_histories")
    .select("id,user_id,created_at,type,title,prompt_summary")
    .eq("type", type)
    .order("created_at", { ascending: false }).order("id")
    .range(offset, offset + HISTORY_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(item => ({ ...item, content: "", inputs: {} })) as GeneratedHistory[];
}

export async function getGeneratedHistory(id: string) {
  const { data, error } = await getSupabase().from("generated_histories").select("*").eq("id", id).single();
  if (error) throw error;
  return data as GeneratedHistory;
}

export async function createGeneratedHistory(history: GeneratedHistoryInput & { id?: string }) {
  const { data, error } = await getSupabase()
    .from("generated_histories")
    .upsert(history, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .single();

  if (error && history.id) {
    const existing = await getGeneratedHistory(history.id).catch(() => null);
    if (existing) return existing;
  }
  if (error) throw error;
  return data as GeneratedHistory;
}

export async function deleteGeneratedHistory(id: string) {
  const { error } = await getSupabase().from("generated_histories").delete().eq("id", id);
  if (error) throw error;
}
