import { NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/api-auth";
import { chat } from "@/lib/deepseek";
import { eventDateToMonth } from "@/lib/dates";

const MAX_FIELD_LENGTH = 5000;

function limitText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function fallbackHistoryTitle(type: "resume" | "intro" | "custom") {
  if (type === "resume") return "个人简历";
  if (type === "intro") return "自我介绍";
  return "自定义内容";
}

function normalizeHistoryTitle(value: string, fallback: string) {
  const title = value
    .trim()
    .split("\n")[0]
    .replace(/^标题[：:]\s*/, "")
    .replace(/^[#*_\s"']+|[#*_\s"']+$/g, "")
    .slice(0, 20);
  return title || fallback;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { error, supabase, user } = await requireUser(request);
    if (error) return error;

    const limited = await checkRateLimit(`generate:${user.id}`, supabase);
    if (limited) return limited;

    const { type, position, jd, scene } = await request.json();
    const safeType = type === "intro" || type === "custom" ? type : "resume";
    const safePosition = limitText(position);
    const safeJd = limitText(jd);
    const safeScene = limitText(scene);

    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("event_date,event_date_end,category,title,result,content,emotion,emotion_note,tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(200);

    if (memoriesError) throw memoriesError;

    // 简历生成时只传 yyyy-MM，不暴露具体日期
    const terms = [safePosition, safeJd, safeScene].join(" ").toLocaleLowerCase().split(/[\s，。；、]+/).filter(term => term.length >= 2);
    const ranked = [...(memories ?? [])].sort((a, b) => {
      const score = (memory: typeof a) => terms.reduce((sum, term) => sum + ([memory.title, memory.category, ...memory.tags, memory.content].join(" ").toLocaleLowerCase().includes(term) ? 1 : 0), 0);
      return score(b) - score(a);
    });
    const sanitizedMemories = ranked.slice(0, 30).map((m) => ({
      ...m,
      event_date: eventDateToMonth(m.event_date) || m.event_date,
      event_date_end: m.event_date_end ? eventDateToMonth(m.event_date_end) || m.event_date_end : null,
      content: m.content.slice(0, 1200),
    }));

    const { data: storedProfile } = await supabase
      .from("profiles")
      .select(
        "display_name,real_name,identity_stage,school,major,grade,contact_email,contact_phone,preferred_tone,extra_info"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    const profile = storedProfile ?? user.user_metadata?.memolog_profile ?? {};

    if (!memories || memories.length === 0) {
      return NextResponse.json({ error: "还没有记录，先去记一些经历吧" }, { status: 400 });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (safeType === "resume") {
      systemPrompt = `你是一个专业的简历撰写专家。根据用户的真实经历，生成一份结构化的简历。
重点突出与目标岗位匹配的技能和成果，使用量化描述。
用中文输出，Markdown格式。`;

      userPrompt = `用户基础档案：
${JSON.stringify(profile ?? {}, null, 2)}

本次选取的真实经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

目标岗位：${safePosition || "通用"}
岗位JD：${safeJd || "无"}

请生成简历，包含：个人信息、教育背景、项目/竞赛经历、技能、自我评价。`;
    } else if (safeType === "intro") {
      systemPrompt = `你是一个自我介绍撰写专家。根据用户的真实经历，为特定场景生成自我介绍。
语言自然口语化，不要太书面。`;

      userPrompt = `用户基础档案：
${JSON.stringify(profile ?? {}, null, 2)}

本次选取的真实经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

场景：${safeScene || "面试"}

请生成一段1-2分钟的自我介绍。`;
    } else {
      systemPrompt = `你了解本次选取的真实经历，根据用户的需求从记忆中调取相关内容并生成回复。`;

      userPrompt = `用户基础档案：
${JSON.stringify(profile ?? {}, null, 2)}

本次选取的真实经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

用户的需求：${safePosition || ""}
${safeJd ? `补充信息：${safeJd}` : ""}`;
    }

    systemPrompt += "\n只能使用资料中的真实事实。不得编造数字、成果或个人信息；资料缺失时省略对应字段。优先遵循用户的生成语气偏好。";
    const content = await chat({
      systemPrompt,
      userPrompt,
      maxTokens: 3000,
      signal: request.signal,
    });

    const fallbackTitle = fallbackHistoryTitle(safeType);
    const historyTitle = normalizeHistoryTitle(content.split("\n").find(line => line.trim()) || fallbackTitle, fallbackTitle);
    return NextResponse.json({ content, historyTitle, selectedCount: sanitizedMemories.length, candidateCount: memories?.length ?? 0 });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 });
  }
}
