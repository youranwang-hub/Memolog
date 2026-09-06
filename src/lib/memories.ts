import { getSupabase } from "@/lib/supabase";
import type { Memory } from "@/lib/types";

export async function fetchMemories({ category, emotion, search, signal }: {
  category?: string; emotion?: string; search?: string; signal?: AbortSignal;
} = {}) {
  const all: Memory[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = getSupabase().from("memories").select("*")
      .order("created_at", { ascending: false }).order("id").range(offset, offset + pageSize - 1);
    if (category && category !== "all") query = query.eq("category", category);
    if (emotion && emotion !== "all") query = query.eq("emotion", emotion);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Memory[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  const term = search?.toLocaleLowerCase();
  return term ? all.filter(memory => [memory.title, memory.content, ...memory.tags].some(value => value.toLocaleLowerCase().includes(term))) : all;
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
