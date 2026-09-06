const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const API_KEY = () => process.env.DEEPSEEK_API_KEY!;

interface ChatParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export async function chat({
  systemPrompt,
  userPrompt,
  maxTokens = 1000,
  model = process.env.DEEPSEEK_MODEL || "deepseek-chat",
  signal,
}: ChatParams): Promise<string> {
  if (!API_KEY()) throw new Error("DeepSeek 尚未配置");
  const timeout = AbortSignal.timeout(45_000);
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek 返回内容为空");
  return content;
}
