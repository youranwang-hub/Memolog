import { getSupabase } from "@/lib/supabase";
import type { GeneratedHistory, GeneratedHistoryInput } from "@/lib/types";

export async function fetchGeneratedHistories() {
  const { data, error } = await getSupabase()
    .from("generated_histories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as GeneratedHistory[];
}

export async function createGeneratedHistory(history: GeneratedHistoryInput) {
  const { data, error } = await getSupabase()
    .from("generated_histories")
    .insert(history)
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedHistory;
}

export async function deleteGeneratedHistory(id: string) {
  const { error } = await getSupabase().from("generated_histories").delete().eq("id", id);
  if (error) throw error;
}
