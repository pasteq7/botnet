import { GoogleGenAI } from "@google/genai";
import { withAbortTimeout } from "../reliability";
import type { LLMAdapter, AdapterConfig, RobustGenerateResult, GroundingChunk } from "./types";
import { resolveAdapterSearchConfig } from "./search-resolver";
import { formatProviderError } from "@/lib/ai/provider-errors";

function getGemini(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export const geminiAdapter: LLMAdapter = {
  async generate(config: AdapterConfig): Promise<RobustGenerateResult | null> {
    try {
      const gemini = getGemini(config.apiKey);

      const { config: resolvedConfig, isSearchEnabled } = resolveAdapterSearchConfig(
        "gemini",
        config.model,
        config.searchMode,
        config.searchEnabled,
        config.config
      );

      const result = await withAbortTimeout(
        (signal) => gemini.models.generateContent({
          model: config.model,
          contents: config.contents,
          config: { ...resolvedConfig, abortSignal: signal },
        }),
        config.timeoutMs
      );

      if (!result.text?.trim()) {
        return { text: "", error: "Empty response from Gemini" };
      }

      const candidate = result.candidates?.[0];
      const metadata = candidate?.groundingMetadata;
      const usage = result.usageMetadata;

      const response: RobustGenerateResult = { 
        text: result.text.trim(),
        tokensUsed: usage?.totalTokenCount 
      };

      if (isSearchEnabled) {
        response.groundingChunks = (metadata?.groundingChunks as GroundingChunk[] | undefined) ?? [];
        response.searchQueries = metadata?.webSearchQueries as string[] | undefined;

        if (!response.groundingChunks?.length) {
          console.warn(
            `[geminiAdapter] Search was enabled but Gemini returned no grounding chunks — model may be hallucinating`
          );
        }
      }

      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const error = formatProviderError("Gemini", msg);
      console.error(`[geminiAdapter] generate failed:`, error);
      return { text: "", error };
    }
  },
};
