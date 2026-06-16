import { getSupabase } from "@/lib/supabase";
import type { Memory } from "@/lib/types";

export async function fetchMemories({
  category,
  emotion,
  search,
}: {
  category?: string;
  emotion?: string;
  search?: string;
} = {}) {
  let query = getSupabase().from("memories").select("*").order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (emotion && emotion !== "all") {
    query = query.eq("emotion", emotion);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,tags.cs.{${search}}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function createMemory(memory: Omit<Memory, "id" | "created_at">) {
  const { data, error } = await getSupabase().from("memories").insert(memory).select().single();
  if (error) throw error;
  return data as Memory;
}

export async function getMemory(id: string) {
  const { data, error } = await getSupabase().from("memories").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Memory;
}

export async function updateMemory(id: string, updates: Partial<Memory>) {
  const { data, error } = await getSupabase()
    .from("memories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Memory;
}

export async function deleteMemory(id: string) {
  const { error } = await getSupabase().from("memories").delete().eq("id", id);
  if (error) throw error;
}
