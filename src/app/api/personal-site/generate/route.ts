import { NextResponse } from "next/server";
import { requirePersonalSiteOwner, checkRateLimit } from "@/lib/api-auth";
import { chat } from "@/lib/deepseek";
import { validatePersonalSiteMemory } from "@/lib/personal-site";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await requirePersonalSiteOwner(request);
    if (auth.error) return auth.error;
    const limited = await checkRateLimit(`personal-site:${auth.user.id}`, auth.supabase);
    if (limited) return limited;
    const { memoryId } = await request.json();
    if (typeof memoryId !== "string") return NextResponse.json({ error: "记忆标识无效" }, { status: 400 });
    const { data: memory, error } = await auth.supabase.from("memories").select("*").eq("id", memoryId).single();
    if (error || !memory) return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
    const content = await chat({
      systemPrompt: `你是个人网站的编辑。基于一条私密记忆，写一份面向导师、面试官与同行的可公开草稿。只使用确实提供的信息；删除敏感的人名、联系方式和私密细节；简约、沉静，避免流水账、夸张和虚构。判断合适栏目：projects（项目）、papers（论文）、research（科研）、hobbies（爱好）、memories（随笔）。输出严格 JSON：{"site_section":"projects|papers|research|hobbies|memories","title":"","summary":"","body":"","category":"","tags":[],"event_date":"","event_date_end":null,"cover_image_url":null,"publish_cover_image":false,"is_public":false}。body 使用纯文本分段。`,
      userPrompt: JSON.stringify({ event_date: memory.event_date, event_date_end: memory.event_date_end, category: memory.category, title: memory.title, result: memory.result, content: memory.content, tags: memory.tags }),
      maxTokens: 1800, signal: request.signal,
    });
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 未返回可编辑的网站版本");
    const draft = validatePersonalSiteMemory(JSON.parse(match[0]));
    return NextResponse.json({ draft: { ...draft, is_public: false } });
  } catch (error) {
    console.error("Generate personal-site version error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "生成网站版本失败" }, { status: 500 });
  }
}
