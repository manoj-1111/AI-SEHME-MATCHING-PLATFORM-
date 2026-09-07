/**
 * Thin LLM client. Works with any OpenAI-compatible API.
 * If no key is configured, callers must use their deterministic fallback.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function hasLLM(): boolean {
  return Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
}

export async function callLLM(
  messages: ChatMessage[],
  opts: { json?: boolean } = {},
): Promise<string> {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("No AI API key configured");
  const baseUrl =
    process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  return content;
}
