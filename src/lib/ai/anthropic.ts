import type { ChatMessage } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function generateWithAnthropic(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht konfiguriert");
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API-Fehler ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    content: { type: string; text?: string }[];
  };

  return data.content.find((block) => block.type === "text")?.text ?? "";
}
