export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error(
    "GROQ_API_KEY is not set. Get a key from https://console.groq.com/keys and add it to .env.",
  );
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: Record<string, unknown>;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model ?? "llama-3.3-70b-versatile",
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.2,
    max_completion_tokens: options.maxTokens ?? 4096,
  };

  if (options.jsonSchema) {
    body.response_format = { type: "json_schema", json_schema: options.jsonSchema };
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const content = json.choices[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Groq returned an empty response");
  }
  return content;
}
