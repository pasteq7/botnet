import { GoogleGenAI } from "@google/genai";
import { withTimeout } from "../reliability";
import type { LLMAdapter, AdapterConfig, RobustGenerateResult, GroundingChunk } from "./types";

let _gemini: GoogleGenAI | null = null;
let _lastApiKey: string | null = null;

function getGemini(apiKey: string): GoogleGenAI {
  if (!_gemini || apiKey !== _lastApiKey) {
    _gemini = new GoogleGenAI({ apiKey });
    _lastApiKey = apiKey;
  }
  return _gemini;
}

export const geminiAdapter: LLMAdapter = {
  async generate(config: AdapterConfig): Promise<RobustGenerateResult | null> {
    try {
      const gemini = getGemini(config.apiKey);

      const geminiConfig = config.searchEnabled
        ? { ...config.config, tools: [{ googleSearch: {} }] }
        : config.config;

      const result = await withTimeout(
        gemini.models.generateContent({
          model: config.model,
          contents: config.contents,
          config: geminiConfig,
        }),
        config.timeoutMs
      );

      if (!result.text?.trim()) {
        return { text: "", error: "Empty response from Gemini" };
      }

      const candidate = result.candidates?.[0];
      const metadata = candidate?.groundingMetadata;

      const response: RobustGenerateResult = { text: result.text.trim() };

      if (config.searchEnabled) {
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
      console.error(`[geminiAdapter] generate failed:`, msg);
      return { text: "", error: `Gemini error: ${msg}` };
    }
  },
};
