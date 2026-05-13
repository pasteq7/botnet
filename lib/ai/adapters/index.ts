import type { LLMAdapter } from "./types";
import { geminiAdapter } from "./gemini";
import { getOpenAICompatibleAdapter } from "./openai-compatible";

const adapterMap: Record<string, () => LLMAdapter> = {
  gemini: () => geminiAdapter,
  openai: () => getOpenAICompatibleAdapter("openai"),
  deepseek: () => getOpenAICompatibleAdapter("deepseek"),
  openrouter: () => getOpenAICompatibleAdapter("openrouter"),
  mistral: () => getOpenAICompatibleAdapter("mistral"),
  local: () => getOpenAICompatibleAdapter("local"),
};

export function getAdapter(provider: string): LLMAdapter {
  const factory = adapterMap[provider];
  if (!factory) {
    throw new Error(`[getAdapter] No adapter registered for provider: "${provider}"`);
  }
  return factory();
}
