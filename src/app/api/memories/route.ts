import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { validateMemory } from "@/lib/memory-validation";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const emotion = searchParams.get("emotion");
    const search = searchParams.get("search");

    let query = supabase.from("memories").select("*").order("created_at", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (emotion && emotion !== "all") {
      query = query.eq("emotion", emotion);
    }
    const page = Math.max(0, Number(searchParams.get("page")) || 0);
    query = query.order("id").range(page * 100, page * 100 + 99);

    const { data, error } = await query;
    if (error) throw error;

    const term = search?.toLocaleLowerCase();
    const rows = data ?? [];
    const filtered = term ? rows.filter(memory => [memory.title, memory.content, ...(memory.tags ?? [])].some(value => String(value).toLocaleLowerCase().includes(term))) : rows;
    return NextResponse.json({ memories: filtered, hasMore: rows.length === 100 });
  } catch (error) {
    console.error("GET memories error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase, user } = auth;
    const body = await request.json();

    const { data, error } = await supabase.from("memories").insert({ ...validateMemory(body), user_id: user.id, raw_input: typeof body.raw_input === "string" ? body.raw_input.slice(0, 5000) : "" }).select().single();

    if (error) throw error;

    return NextResponse.json({ memory: data }, { status: 201 });
  } catch (error) {
    console.error("POST memory error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
