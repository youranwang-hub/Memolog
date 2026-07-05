import { NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/api-auth";
import { chat } from "@/lib/deepseek";
import { eventDateToMonth } from "@/lib/dates";

const MAX_FIELD_LENGTH = 5000;

function limitText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

export async function POST(request: Request) {
  try {
    const { error, supabase, user } = await requireUser(request);
    if (error) return error;

    const limited = checkRateLimit(`generate:${user.id}`);
    if (limited) return limited;

    const { type, position, jd, scene } = await request.json();
    const safeType = type === "intro" || type === "custom" ? type : "resume";
    const safePosition = limitText(position);
    const safeJd = limitText(jd);
    const safeScene = limitText(scene);

    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("event_date,category,title,result,content,emotion,emotion_note,tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (memoriesError) throw memoriesError;

    // 简历生成时只传 yyyy-MM，不暴露具体日期
    const sanitizedMemories = (memories ?? []).map((m) => ({
      ...m,
      event_date: eventDateToMonth(m.event_date) || m.event_date,
    }));

    const { data: storedProfile } = await supabase
      .from("profiles")
      .select(
        "display_name,real_name,identity_stage,school,major,grade,target_direction,contact_email,contact_phone,preferred_tone,extra_info"
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

用户的所有经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

目标岗位：${safePosition || "通用"}
岗位JD：${safeJd || "无"}

请生成简历，包含：个人信息、教育背景、项目/竞赛经历、技能、自我评价。`;
    } else if (safeType === "intro") {
      systemPrompt = `你是一个自我介绍撰写专家。根据用户的真实经历，为特定场景生成自我介绍。
语言自然口语化，不要太书面。`;

      userPrompt = `用户基础档案：
${JSON.stringify(profile ?? {}, null, 2)}

用户的所有经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

场景：${safeScene || "面试"}

请生成一段1-2分钟的自我介绍。`;
    } else {
      systemPrompt = `你了解用户的所有经历，根据用户的需求从记忆中调取相关内容并生成回复。`;

      userPrompt = `用户基础档案：
${JSON.stringify(profile ?? {}, null, 2)}

用户的所有经历（日期格式为 YYYY-MM）：
${JSON.stringify(sanitizedMemories, null, 2)}

用户的需求：${safePosition || ""}
${safeJd ? `补充信息：${safeJd}` : ""}`;
    }

    const content = await chat({
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
    });

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 });
  }
}
