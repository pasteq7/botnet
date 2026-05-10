import { GoogleGenAI } from "@google/genai";
import {
  retryWithBackoff,
  withTimeout,
  getTimeoutForTier,
} from "./reliability";
import type { RequestTier } from "./reliability";

// --- Gemini client singleton ---

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
}

let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = getGemini();
  }
  return _gemini;
}

export const GENERATIVE_MODEL = "gemma-4-31b-it";
export const FALLBACK_MODEL = "gemma-4-26b-a4b-it";

/**
 * Safely extracts JSON from a string that might contain markdown code blocks.
 */
export function extractJSON<T>(content: string | null): T | null {
  if (!content) return null;

  try {
    // 1. Try direct parse first
    return JSON.parse(content) as T;
  } catch {
    // 2. Try to find JSON inside markdown blocks
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content inside backticks:", err);
      }
    }

    // 3. Try to find a JSON array between [ and ]
    const bracketMatch = content.match(/(\[[\s\S]*\])/);
    if (bracketMatch && bracketMatch[1]) {
      try {
        return JSON.parse(bracketMatch[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content between brackets:", err);
      }
    }

    // 4. Try to find a JSON object between { and }
    const braceMatch = content.match(/(\{[\s\S]*\})/);
    if (braceMatch && braceMatch[1]) {
      try {
        return JSON.parse(braceMatch[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content between braces:", err);
      }
    }

    console.error("[extractJSON] Could not extract valid JSON from response");
    return null;
  }
}

// --- Robust Generate ---

export interface RobustGenerateConfig {
  tier?: RequestTier;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackModel?: string;
  fallbackContent?: string;
  config?: Record<string, unknown>;
}

export async function robustGenerate(
  contents: string,
  options: RobustGenerateConfig = {}
): Promise<string | null> {
  const {
    tier = "normal",
    timeoutMs = getTimeoutForTier(tier),
    maxRetries = 1,
    fallbackModel = FALLBACK_MODEL,
    fallbackContent,
    config,
  } = options;

  const gemini = getGeminiClient();

  const attempt = async () => {
    const result = await withTimeout(
      gemini.models.generateContent({
        model: GENERATIVE_MODEL,
        contents,
        config,
      }),
      timeoutMs
    );

    return result;
  };

  try {
    const response = await retryWithBackoff(attempt, { maxRetries, tier });
    return response.text?.trim() ?? null;
  } catch (err) {
    const errorInfo = err instanceof Error ? { name: err.name, message: err.message } : { error: String(err) };
    console.error(
      `[robustGenerate] Primary model ${GENERATIVE_MODEL} failed after ${maxRetries} retries.`,
      errorInfo
    );

    if (fallbackModel) {
      console.warn(`[robustGenerate] Falling back to ${fallbackModel}`);
      try {
        const fallbackResponse = await withTimeout(
          gemini.models.generateContent({
            model: fallbackModel,
            contents,
            config,
          }),
          timeoutMs * 1.5
        );
        return fallbackResponse.text?.trim() ?? null;
      } catch (fallbackErr) {
        console.error(
          `[robustGenerate] Fallback model ${fallbackModel} also failed:`,
          fallbackErr
        );
      }
    }

    return fallbackContent ?? null;
  }
}
