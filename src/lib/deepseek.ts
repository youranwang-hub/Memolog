const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const API_KEY = () => process.env.DEEPSEEK_API_KEY!;

interface ChatParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
}

export async function chat({
  systemPrompt,
  userPrompt,
  maxTokens = 1000,
  model = "deepseek-chat",
}: ChatParams): Promise<string> {
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
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
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
