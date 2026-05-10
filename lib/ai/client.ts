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

const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  mistral: "https://api.mistral.ai/v1",
  perplexity: "https://api.perplexity.ai",
};

/**
 * Safely extracts JSON from a string that might contain markdown code blocks
 * or other common LLM output quirks.
 */
export function extractJSON<T>(content: string | null): T | null {
  if (!content) return null;

  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1].trim()) as T;
    } catch {}
  }

  const bracketMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (bracketMatch?.[1]) {
    try {
      return JSON.parse(bracketMatch[1]) as T;
    } catch {}
  }

  const braceMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (braceMatch?.[1]) {
    try {
      return JSON.parse(braceMatch[1]) as T;
    } catch {}
  }

  const cleaned = trimmed
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

  if (cleaned) {
    try {
      return JSON.parse(cleaned) as T;
    } catch {}

    try {
      return JSON.parse(cleaned.replace(/'/g, '"')) as T;
    } catch {}
  }

  console.error("[extractJSON] Could not extract valid JSON from response");
  return null;
}

// --- Robust Generate ---

export interface RobustGenerateConfig {
  tier?: RequestTier;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackContent?: string;
  config?: Record<string, unknown>;
  provider?: string;
}

async function callGemini(
  model: string,
  contents: string,
  apiKey: string,
  config: Record<string, unknown> | undefined,
  timeoutMs: number
): Promise<string | null> {
  const gemini = getGeminiClient(apiKey);
  const result = await withTimeout(
    gemini.models.generateContent({ model, contents, config }),
    timeoutMs
  );
  return result.text?.trim() ?? null;
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  contents: string,
  apiKey: string,
  config: Record<string, unknown> | undefined,
  timeoutMs: number
): Promise<string | null> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: contents }],
  };

  if (config?.temperature != null) body.temperature = config.temperature;
  if (config?.maxOutputTokens != null) body.max_tokens = config.maxOutputTokens;
  if (config?.top_p != null) body.top_p = config.top_p;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = new Error(`${response.status}: ${text.slice(0, 200)}`) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } finally {
    clearTimeout(timer);
  }
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
    provider = "gemini",
  } = options;

  const aiConfig = await getActiveAiConfig(provider);
  if (!aiConfig) {
    console.warn(`[robustGenerate] No active config for "${provider}"`);
    return null;
  }

  if (provider === "gemini") {
    const attempt = async () =>
      callGemini(aiConfig.defaultModel, contents, aiConfig.apiKey, config, timeoutMs);

    try {
      return await retryWithBackoff(attempt, { maxRetries, tier });
    } catch (err) {
      const errorInfo = err instanceof Error ? { name: err.name, message: err.message } : { error: String(err) };
      console.error(`[robustGenerate] Gemini ${aiConfig.defaultModel} failed after ${maxRetries} retries.`, errorInfo);

      if (aiConfig.fallbackModel) {
        console.warn(`[robustGenerate] Falling back to ${aiConfig.fallbackModel}`);
        try {
          return await callGemini(aiConfig.fallbackModel, contents, aiConfig.apiKey, config, timeoutMs * 1.5);
        } catch (fallbackErr) {
          console.error(`[robustGenerate] Fallback ${aiConfig.fallbackModel} also failed:`, fallbackErr);
        }
      }

      return fallbackContent ?? null;
    }
  }

  const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];
  if (!baseUrl) {
    console.error(`[robustGenerate] Unknown provider: "${provider}"`);
    return null;
  }

  let resolvedModel = aiConfig.defaultModel;
  let resolvedConfig = config;

  if (resolvedConfig?.tools) {
    if (provider === "perplexity" && !resolvedModel.includes("sonar")) {
      resolvedModel = "sonar-pro";
    }
    const rest = { ...resolvedConfig };
    delete rest.tools;
    resolvedConfig = Object.keys(rest).length > 0 ? rest : undefined;
  }

  const attempt = async () =>
    callOpenAICompatible(baseUrl, resolvedModel, contents, aiConfig.apiKey, resolvedConfig, timeoutMs);

  try {
    return await retryWithBackoff(attempt, { maxRetries, tier });
  } catch (err) {
    const errorInfo = err instanceof Error ? { name: err.name, message: err.message } : { error: String(err) };
    console.error(`[robustGenerate] ${provider} ${resolvedModel} failed after ${maxRetries} retries.`, errorInfo);

    if (aiConfig.fallbackModel) {
      console.warn(`[robustGenerate] ${provider} falling back to ${aiConfig.fallbackModel}`);
      try {
        return await callOpenAICompatible(baseUrl, aiConfig.fallbackModel, contents, aiConfig.apiKey, resolvedConfig, timeoutMs * 1.5);
      } catch (fallbackErr) {
        console.error(`[robustGenerate] ${provider} fallback ${aiConfig.fallbackModel} also failed:`, fallbackErr);
      }
    }

    return fallbackContent ?? null;
  }
}
