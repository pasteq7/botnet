import type { LLMAdapter } from "./types";
import { geminiAdapter } from "./gemini";
import { getOpenAICompatibleAdapter } from "./openai-compatible";

const adapterMap: Record<string, () => LLMAdapter> = {
  gemini: () => geminiAdapter,
  deepseek: () => getOpenAICompatibleAdapter("deepseek"),
  openrouter: () => getOpenAICompatibleAdapter("openrouter"),
  mistral: () => getOpenAICompatibleAdapter("mistral"),
};

export function getAdapter(provider: string): LLMAdapter {
  const factory = adapterMap[provider];
  if (!factory) {
    throw new Error(`[getAdapter] No adapter registered for provider: "${provider}"`);
  }
  return factory();
}
