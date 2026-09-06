import { NextResponse } from "next/server";
import { requirePersonalSiteOwner } from "@/lib/api-auth";
import { validatePersonalSiteMemory } from "@/lib/personal-site";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePersonalSiteOwner(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase.from("personal_site_memories").select("*").eq("memory_id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "读取网站版本失败" }, { status: 500 });
  return NextResponse.json({ publication: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePersonalSiteOwner(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const { data: memory, error: memoryError } = await auth.supabase.from("memories").select("id").eq("id", id).single();
    if (memoryError || !memory) return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
    const values = validatePersonalSiteMemory(await request.json());
    const { data, error } = await auth.supabase.from("personal_site_memories").upsert({
      memory_id: id, user_id: auth.user.id, ...values, published_at: values.is_public ? new Date().toISOString() : null,
    }, { onConflict: "memory_id" }).select().single();
    if (error) throw error;
    return NextResponse.json({ publication: data });
  } catch (error) {
    console.error("Save personal-site version error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存网站版本失败" }, { status: 400 });
  }
}
