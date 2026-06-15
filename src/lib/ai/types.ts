export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiProvider = "anthropic" | "huggingface";
