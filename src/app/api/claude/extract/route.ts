import { NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/api-auth";
import { normalizeEventDate } from "@/lib/dates";
import { chat } from "@/lib/deepseek";

const SYSTEM_PROMPT = `你是一个信息结构化助手。用户输入了一条个人经历，请提炼为以下JSON格式。

规则：
- event_date：统一输出 YYYY-MM，只保留到月份，不要输出具体日期。用户写 2026.6.18、2026/6/18、2026年6月18日 都输出 2026-06。如果用户没有给明确日期，用当前月份
- category：只能是 竞赛/项目/实习/课程/生活/技能/其他
- title：简短的标题（10字以内）
- result：成果总结（如果有），否则为 ""
- content：保留经历中的关键上下文，可以用2-5句描述完整过程、承担的角色、具体行动、使用的方法和结果。不要只压缩成一句空泛总结
- emotion：只能是 proud/excited/relieved/neutral/tired/frustrated/sad
- emotion_note：保留用户表达的情绪原文，如果没有则为 ""
- tags：提炼2-5个关键词作为数组

只返回JSON，不要其他内容。`;

export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error) return error;

    const limited = checkRateLimit(`extract:${user.id}`);
    if (limited) return limited;

    const { rawInput } = await request.json();
    const normalizedInput = typeof rawInput === "string" ? rawInput.trim() : "";

    if (!normalizedInput) {
      return NextResponse.json({ error: "输入不能为空" }, { status: 400 });
    }
    if (normalizedInput.length > 5000) {
      return NextResponse.json({ error: "单条记录太长了，请先拆成几条保存" }, { status: 400 });
    }

    const text = await chat({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: normalizedInput,
      maxTokens: 900,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI 解析失败，请重新描述" }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    extracted.event_date = normalizeEventDate(extracted.event_date);
    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: "提炼失败，请稍后重试" }, { status: 500 });
  }
}
