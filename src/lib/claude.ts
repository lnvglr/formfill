// Backwards-compatible re-exports — use @/lib/ai/provider in new code.
export {
  generateText as callClaude,
  parseJsonResponse,
  getActiveProvider,
} from "./ai/provider";
