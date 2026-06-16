import { NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";

export async function POST(request: Request) {
  try {
    const { memories, type, position, jd, scene } = await request.json();

    if (!memories || memories.length === 0) {
      return NextResponse.json({ error: "还没有记录，先去记一些经历吧" }, { status: 400 });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "resume") {
      systemPrompt = `你是一个专业的简历撰写专家。根据用户的真实经历，生成一份结构化的简历。
重点突出与目标岗位匹配的技能和成果，使用量化描述。
用中文输出，Markdown格式。`;

      userPrompt = `用户的所有经历：
${JSON.stringify(memories, null, 2)}

目标岗位：${position || "通用"}
岗位JD：${jd || "无"}

请生成简历，包含：个人信息、教育背景、项目/竞赛经历、技能、自我评价。`;
    } else if (type === "intro") {
      systemPrompt = `你是一个自我介绍撰写专家。根据用户的真实经历，为特定场景生成自我介绍。
语言自然口语化，不要太书面。`;

      userPrompt = `用户的所有经历：
${JSON.stringify(memories, null, 2)}

场景：${scene || "面试"}

请生成一段1-2分钟的自我介绍。`;
    } else {
      systemPrompt = `你了解用户的所有经历，根据用户的需求从记忆中调取相关内容并生成回复。`;

      userPrompt = `用户的所有经历：
${JSON.stringify(memories, null, 2)}

用户的需求：${position || ""}
${jd ? `补充信息：${jd}` : ""}`;
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
