import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";
import {
  retryWithBackoff,
  withTimeout,
  getTimeoutForTier,
} from "./reliability";
import type { RequestTier } from "./reliability";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface AiConfig {
  apiKey: string;
  defaultModel: string;
  fallbackModel: string | null;
}

let _cachedConfig: AiConfig | null = null;
let _cacheExpiry = 0;

export async function getActiveAiConfig(provider = "gemini"): Promise<AiConfig | null> {
  if (_cachedConfig && Date.now() < _cacheExpiry) return _cachedConfig;

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("ai_configs")
    .select("encrypted_key, default_model, fallback_model")
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (!data?.encrypted_key) return null;

  const apiKey = decrypt(data.encrypted_key);

  const config = {
    apiKey,
    defaultModel: data.default_model,
    fallbackModel: data.fallback_model,
  };

  if (config.apiKey !== _cachedConfig?.apiKey) _gemini = null;

  _cachedConfig = config;
  _cacheExpiry = Date.now() + 60_000;
  return config;
}

// --- Gemini client singleton ---

function getGemini(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!_gemini) {
    _gemini = getGemini(apiKey);
  }
  return _gemini;
}

/**
 * Safely extracts JSON from a string that might contain markdown code blocks.
 */
export function extractJSON<T>(content: string | null): T | null {
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content inside backticks:", err);
      }
    }

    const bracketMatch = content.match(/(\[[\s\S]*\])/);
    if (bracketMatch && bracketMatch[1]) {
      try {
        return JSON.parse(bracketMatch[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content between brackets:", err);
      }
    }

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
    fallbackContent,
    config,
  } = options;

  const aiConfig = await getActiveAiConfig("gemini");
  if (!aiConfig) {
    console.warn("[robustGenerate] No active Gemini config found");
    return null;
  }

  const gemini = getGeminiClient(aiConfig.apiKey);

  const attempt = async () => {
    const result = await withTimeout(
      gemini.models.generateContent({
        model: aiConfig.defaultModel,
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
      `[robustGenerate] Primary model ${aiConfig.defaultModel} failed after ${maxRetries} retries.`,
      errorInfo
    );

    if (aiConfig.fallbackModel) {
      console.warn(`[robustGenerate] Falling back to ${aiConfig.fallbackModel}`);
      try {
        const fallbackResponse = await withTimeout(
          gemini.models.generateContent({
            model: aiConfig.fallbackModel,
            contents,
            config,
          }),
          timeoutMs * 1.5
        );
        return fallbackResponse.text?.trim() ?? null;
      } catch (fallbackErr) {
        console.error(
          `[robustGenerate] Fallback model ${aiConfig.fallbackModel} also failed:`,
          fallbackErr
        );
      }
    }

    return fallbackContent ?? null;
  }
}
