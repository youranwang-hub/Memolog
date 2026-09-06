import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { validateMemory } from "@/lib/memory-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    const { id } = await params;

    const { data, error } = await supabase.from("memories").select("*").eq("id", id).single();

    if (error) throw error;

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error("GET memory error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    const { id } = await params;
    const body = await request.json();
    const { data: current, error: readError } = await supabase.from("memories").select("*").eq("id", id).single();
    if (readError) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    const updates = validateMemory({ ...current, ...body });

    const { data, error } = await supabase
      .from("memories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error("PUT memory error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    const { id } = await params;

    const { error } = await supabase.from("memories").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE memory error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
