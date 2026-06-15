import { generateWithAnthropic } from "./anthropic";
import { generateWithHuggingFace } from "./huggingface";
import type { AiProvider, ChatMessage } from "./types";

function getProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "huggingface" || provider === "hf") {
    return "huggingface";
  }

  if (provider === "anthropic" || provider === "claude") {
    return "anthropic";
  }

  // Auto-detect: prefer free/local HF when configured, otherwise Claude.
  if (process.env.HF_TOKEN || process.env.HF_BASE_URL?.includes("localhost")) {
    return "huggingface";
  }

  return "anthropic";
}

export function getActiveProvider(): AiProvider {
  return getProvider();
}

export async function generateText(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const provider = getProvider();

  if (provider === "huggingface") {
    return generateWithHuggingFace(messages, systemPrompt);
  }

  return generateWithAnthropic(messages, systemPrompt);
}

export function parseJsonResponse<T>(raw: string): T {
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Keine gültige JSON-Antwort vom Modell");
  }
}
