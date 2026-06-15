import type { ChatMessage } from "./types";

type OpenAiChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: string;
};

/**
 * Works with:
 * - Hugging Face Inference Router (free tier): https://router.huggingface.co/v1
 * - Local TGI / vLLM / llama.cpp servers exposing OpenAI-compatible /v1/chat/completions
 */
export async function generateWithHuggingFace(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const baseUrl = (
    process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1"
  ).replace(/\/$/, "");
  const model = resolveModelId();
  const token = process.env.HF_TOKEN;

  if (!token && baseUrl.includes("huggingface.co")) {
    throw new Error(
      "HF_TOKEN ist nicht konfiguriert. Erstelle einen Token unter huggingface.co/settings/tokens mit der Berechtigung „Inference Providers“."
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2000,
    temperature: 0.1,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  // Qwen3 models emit long reasoning blocks by default, which wastes tokens and breaks JSON.
  if (model.toLowerCase().includes("qwen3")) {
    body.chat_template_kwargs = { enable_thinking: false };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (
      response.status === 400 &&
      errorText.includes("model_not_supported")
    ) {
      throw new Error(
        `Modell „${model}“ ist für deinen HF-Account nicht verfügbar. ` +
          `Aktiviere Provider unter huggingface.co/settings/inference-providers ` +
          `oder setze HF_MODEL auf ein verfügbares Modell (z. B. meta-llama/Llama-3.3-70B-Instruct).`
      );
    }
    throw new Error(`Hugging Face API-Fehler ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as OpenAiChatResponse;

  if (data.error) {
    throw new Error(`Hugging Face Fehler: ${data.error}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Leere Antwort vom Hugging-Face-Modell");
  }

  return content;
}

function resolveModelId(): string {
  const configured =
    process.env.HF_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct";
  const policy = process.env.HF_POLICY; // fastest | cheapest | groq | together etc.

  if (configured.includes(":")) {
    return configured;
  }

  if (policy) {
    return `${configured}:${policy}`;
  }

  // Router default policy — picks an enabled provider automatically.
  return `${configured}:fastest`;
}
