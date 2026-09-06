import { NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/api-auth";
import { validateMemory } from "@/lib/memory-validation";
import { chat } from "@/lib/deepseek";
import { getCategories } from "@/lib/types";

function createSystemPrompt(categories: string[]) {
  return `你是一个信息结构化助手。用户输入了一条个人经历，请提炼为以下JSON格式。

规则：
- 未提供日期时 event_date 为 "未知"，不要推测日期
- 内容为空时不得编造经历
- event_date：尽量输出 YYYY-MM-DD（如 2026-06-18）。如果用户只给了月份（如"2026年6月"），则输出 YYYY-MM。不要编造具体日期
- event_date_end：如果用户描述的是一个阶段（如"2026年6月到8月"、"持续三周"、"暑假实习"），请输出阶段结束日期 YYYY-MM-DD 或 YYYY-MM；如果描述的是单日经历则为 null
- category：只能从以下分类中选择：${categories.join("/")}
- title：简短的标题（10字以内）
- result：成果总结（如果有），否则为 ""
- content：保留经历中的关键上下文，可以用2-5句描述完整过程、承担的角色、具体行动、使用的方法和结果。不要只压缩成一句空泛总结
- emotion：只能是 proud/excited/relieved/neutral/tired/frustrated/sad
- emotion_note：保留用户表达的情绪原文，如果没有则为 ""
- tags：提炼2-5个关键词作为数组

只返回JSON，不要其他内容。`;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { error, supabase, user } = await requireUser(request);
    if (error) return error;

    const limited = await checkRateLimit(`extract:${user.id}`, supabase);
    if (limited) return limited;

    const { rawInput } = await request.json();
    const normalizedInput = typeof rawInput === "string" ? rawInput.trim() : "";

    if (!normalizedInput) {
      return NextResponse.json({ error: "输入不能为空" }, { status: 400 });
    }
    if (normalizedInput.length > 5000) {
      return NextResponse.json({ error: "单条记录太长了，请先拆成几条保存" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("custom_categories")
      .eq("user_id", user.id)
      .maybeSingle();
    const metadataCategories = user.user_metadata?.memolog_profile?.custom_categories;
    const categories = getCategories(
      Array.isArray(profile?.custom_categories)
        ? profile.custom_categories
        : Array.isArray(metadataCategories)
          ? metadataCategories.filter((category): category is string => typeof category === "string")
          : undefined
    );

    const text = await chat({
      systemPrompt: `${createSystemPrompt(categories)}\n当前日期（中国时区）：${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date())}，仅在用户明确使用相对日期时作为参照。`,
      userPrompt: normalizedInput,
      maxTokens: 1800,
      signal: request.signal,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI 解析失败，请重新描述" }, { status: 500 });
    }

    const extracted = validateMemory(JSON.parse(jsonMatch[0]), categories);
    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: "提炼失败，请稍后重试" }, { status: 500 });
  }
}
