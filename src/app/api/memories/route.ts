import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const supabase = getServerSupabase();
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
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ memories: data ?? [] });
  } catch (error) {
    console.error("GET memories error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();

    const { data, error } = await supabase.from("memories").insert(body).select().single();

    if (error) throw error;

    return NextResponse.json({ memory: data }, { status: 201 });
  } catch (error) {
    console.error("POST memory error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
