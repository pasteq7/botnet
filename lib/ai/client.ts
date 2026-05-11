import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";
import { retryWithBackoff, getTimeoutForTier } from "./reliability";
import type { RequestTier } from "./reliability";
import type { RobustGenerateResult } from "./adapters/types";
import { getAdapter } from "./adapters";

export type { RobustGenerateResult };

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface ActiveAiConfig {
  apiKey: string;
  defaultModel: string;
  fallbackModel: string | null;
  provider: string;
}

let _cachedConfig: ActiveAiConfig | null = null;
let _cacheExpiry = 0;

export async function getActiveAiConfig(): Promise<ActiveAiConfig | null> {
  if (_cachedConfig && Date.now() < _cacheExpiry) return _cachedConfig;

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("ai_configs")
    .select("encrypted_key, default_model, fallback_model, provider")
    .eq("is_active", true)
    .single();

  if (!data?.encrypted_key) return null;

  const apiKey = decrypt(data.encrypted_key);

  const config = {
    apiKey,
    defaultModel: data.default_model,
    fallbackModel: data.fallback_model,
    provider: data.provider,
  };

  _cachedConfig = config;
  _cacheExpiry = Date.now() + 60_000;
  return config;
}

export interface RobustGenerateConfig {
  tier?: RequestTier;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackContent?: string;
  config?: Record<string, unknown>;
  searchEnabled?: boolean;
}

export async function robustGenerate(
  contents: string,
  options: RobustGenerateConfig = {}
): Promise<RobustGenerateResult | null> {
  const {
    tier = "normal",
    timeoutMs = getTimeoutForTier(tier),
    maxRetries = 1,
    fallbackContent,
    config: userConfig,
    searchEnabled = false,
  } = options;

  const aiConfig = await getActiveAiConfig();
  if (!aiConfig) {
    console.warn("[robustGenerate] No active AI config");
    return null;
  }

  const adapter = getAdapter(aiConfig.provider);

  const attempt = async () =>
    adapter.generate({
      contents,
      model: aiConfig.defaultModel,
      apiKey: aiConfig.apiKey,
      timeoutMs,
      config: userConfig,
      searchEnabled,
    });

  try {
    const result = await retryWithBackoff(attempt, { maxRetries, tier });

    if (!result) return fallbackContent ? { text: fallbackContent } : null;

    return result;
  } catch (err) {
    const errorInfo =
      err instanceof Error
        ? { name: err.name, message: err.message }
        : { error: String(err) };
    console.error(
      `[robustGenerate] ${aiConfig.provider} ${aiConfig.defaultModel} failed after ${maxRetries} retries.`,
      errorInfo
    );

    if (aiConfig.fallbackModel) {
      console.warn(`[robustGenerate] Falling back to ${aiConfig.fallbackModel}`);
      try {
        const fallbackResult = await adapter.generate({
          contents,
          model: aiConfig.fallbackModel,
          apiKey: aiConfig.apiKey,
          timeoutMs: timeoutMs * 1.5,
          config: userConfig,
          searchEnabled,
        });

        if (!fallbackResult) return fallbackContent ? { text: fallbackContent } : null;

        return fallbackResult;
      } catch (fallbackErr) {
        console.error(
          `[robustGenerate] Fallback ${aiConfig.fallbackModel} also failed:`,
          fallbackErr
        );
      }
    }

    return fallbackContent ? { text: fallbackContent } : null;
  }
}
