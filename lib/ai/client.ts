import { decrypt } from "@/lib/encryption";
import { retryWithBackoff, getTimeoutForTier, isRetryableError } from "@/lib/ai/reliability";
import type { RequestTier } from "@/lib/ai/reliability";
import type { RobustGenerateResult } from "@/lib/ai/adapters/types";
import type { SearchProviderId } from "@/types";
import type { AiRole, SearchMode } from "@/types";
import { getAdapter } from "@/lib/ai/adapters";
import { createAdminClient } from "@/lib/supabase/admin";

export type { RobustGenerateResult };

function getServiceSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    console.error("[getServiceSupabase] Missing SUPABASE_SECRET_KEY");
  }

  return createAdminClient();
}

export interface ActiveAiConfig {
  apiKey: string;
  defaultModel: string;
  fallbackModel: string | null;
  provider: string;
  baseUrl: string | null;
  searchMode: SearchMode;
  role: AiRole;
}

export interface ActiveSearchConfig {
  provider: SearchProviderId;
  apiKey: string | null;
}

export type ActiveAiConfigMetadata = Omit<ActiveAiConfig, "apiKey">;
export type ActiveSearchConfigMetadata = Pick<ActiveSearchConfig, "provider">;

const _cache = new Map<string, { config: ActiveAiConfig; expiry: number }>();

export function clearActiveAiConfigCache() {
  _cache.clear();
}

export async function getActiveAiConfig(role?: AiRole): Promise<ActiveAiConfig | null> {
  const cacheKey = role ?? 'full';
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.config;

  const supabase = getServiceSupabase();

  let query = supabase
    .from("ai_configs")
    .select("encrypted_key, default_model, fallback_model, provider, base_url, search_mode, role")
    .eq("is_active", true);

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[getActiveAiConfig] Database error fetching role="${role ?? 'full'}":`, error.message);
    return null;
  }

  if (data?.encrypted_key) {
    const apiKey = decrypt(data.encrypted_key);
    const config: ActiveAiConfig = {
      apiKey,
      defaultModel: data.default_model,
      fallbackModel: data.fallback_model,
      provider: data.provider,
      baseUrl: data.base_url ?? null,
      searchMode: data.search_mode ?? 'none',
      role: data.role,
    };
    _cache.set(cacheKey, { config, expiry: Date.now() + 15_000 });
    return config;
  }

  if (role && role !== 'full') {
    return getActiveAiConfig('full');
  }

  return null;
}

export async function getActiveAiConfigMetadata(role?: AiRole): Promise<ActiveAiConfigMetadata | null> {
  const supabase = getServiceSupabase();

  let query = supabase
    .from("ai_configs")
    .select("default_model, fallback_model, provider, base_url, search_mode, role")
    .eq("is_active", true);

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error(`[getActiveAiConfigMetadata] Database error fetching role="${role ?? 'full'}":`, error.message);
    return null;
  }

  if (data) {
    return {
      defaultModel: data.default_model,
      fallbackModel: data.fallback_model,
      provider: data.provider,
      baseUrl: data.base_url ?? null,
      searchMode: data.search_mode ?? 'none',
      role: data.role,
    };
  }

  if (role && role !== 'full') {
    return getActiveAiConfigMetadata('full');
  }

  return null;
}

export async function getActiveSearchConfig(): Promise<ActiveSearchConfig | null> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("search_configs")
    .select("provider, encrypted_key")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[getActiveSearchConfig] Database error:", error.message);
    return null;
  }

  if (!data) return null;

  if (data.provider === 'none') return { provider: 'none', apiKey: null };

  if (data.encrypted_key) {
    return {
      provider: data.provider as SearchProviderId,
      apiKey: decrypt(data.encrypted_key),
    };
  }

  return null;
}

export async function getActiveSearchConfigMetadata(): Promise<ActiveSearchConfigMetadata | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("search_configs")
    .select("provider")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[getActiveSearchConfigMetadata] Database error:", error.message);
    return null;
  }

  return data ? { provider: data.provider as SearchProviderId } : null;
}

export interface RobustGenerateConfig {
  tier?: RequestTier;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackContent?: string;
  config?: Record<string, unknown>;
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  role?: AiRole;
  aiConfig?: ActiveAiConfig;
}

function resolveSearchMode(aiConfig: ActiveAiConfig, searchEnabled: boolean, searchMode?: SearchMode): SearchMode {
  if (searchMode) return searchMode;
  if (searchEnabled) {
    const canNative = aiConfig.searchMode === 'native' || aiConfig.searchMode === 'native_with_fallback';
    return canNative ? 'native' : 'none';
  }
  return 'none';
}

export async function robustGenerate(
  contents: string,
  options: RobustGenerateConfig = {}
): Promise<RobustGenerateResult | null> {
  const {
    tier = "normal",
    timeoutMs = getTimeoutForTier(tier),
    maxRetries = 3,
    fallbackContent,
    config: userConfig,
    searchEnabled = false,
    searchMode,
    role,
    aiConfig: preFetchedConfig,
  } = options;

  const aiConfig = preFetchedConfig ?? await getActiveAiConfig(role);
  if (!aiConfig) {
    const error = `AI configuration error: No active AI config for role="${role ?? 'full'}".`;
    console.warn(`[robustGenerate] ${error} Go to Admin > Settings to configure an AI provider.`);
    return { text: "", error };
  }

  const adapter = getAdapter(aiConfig.provider);
  const effectiveSearchMode = resolveSearchMode(aiConfig, searchEnabled, searchMode);

  const buildConfig = (modelOverride?: string) => ({
    contents,
    model: modelOverride ?? aiConfig.defaultModel,
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl ?? undefined,
    timeoutMs,
    config: userConfig,
    searchMode: effectiveSearchMode,
  });

  const attempt = async () => {
    const result = await adapter.generate(buildConfig());
    if (result && result.error && isRetryableError(result.error)) {
      throw new Error(result.error);
    }
    return result;
  };

  try {
    const result = await retryWithBackoff(attempt, { maxRetries, tier });

    if (!result) return fallbackContent ? { text: fallbackContent } : null;

    if (result.error && aiConfig.fallbackModel) {
      console.warn(`[robustGenerate] ${aiConfig.defaultModel} returned error, falling back to ${aiConfig.fallbackModel}: ${result.error}`);
      let fallbackError: string | undefined;
      try {
        const fallbackResult = await adapter.generate(buildConfig(aiConfig.fallbackModel));
        if (fallbackResult && !fallbackResult.error) {
          return {
            ...fallbackResult,
            modelUsed: aiConfig.fallbackModel,
            groundingChunks: fallbackResult.groundingChunks ?? result.groundingChunks,
            searchQueries: fallbackResult.searchQueries ?? result.searchQueries,
            tokensUsed: (result.tokensUsed ?? 0) + (fallbackResult.tokensUsed ?? 0)
          };
        }
        fallbackError = fallbackResult?.error ?? "fallback model returned no response";
      } catch (fallbackErr) {
        fallbackError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error(`[robustGenerate] Fallback ${aiConfig.fallbackModel} also failed:`, fallbackErr);
      }

      if (fallbackError) {
        return {
          ...result,
          modelUsed: aiConfig.defaultModel,
          error: `${result.error} (fallback model ${aiConfig.fallbackModel} failed: ${fallbackError})`,
          tokensUsed: result.tokensUsed,
        };
      }
    }

    return {
      ...result,
      modelUsed: aiConfig.defaultModel,
      error: result.error || "Unknown error",
      tokensUsed: result.tokensUsed
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `[robustGenerate] ${aiConfig.provider} ${aiConfig.defaultModel} failed after ${maxRetries} retries:`,
      errorMessage
    );

    if (aiConfig.fallbackModel) {
      console.warn(`[robustGenerate] Falling back to ${aiConfig.fallbackModel}`);
      try {
        const fallbackResult = await adapter.generate(buildConfig(aiConfig.fallbackModel));

        if (fallbackResult) {
          return {
            ...fallbackResult,
            error: fallbackResult.error
              ? `${errorMessage} (fallback model ${aiConfig.fallbackModel} failed: ${fallbackResult.error})`
              : undefined,
            modelUsed: fallbackResult.error ? aiConfig.defaultModel : aiConfig.fallbackModel,
            tokensUsed: fallbackResult.tokensUsed,
          };
        }
      } catch (fallbackErr) {
        const fallbackError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error(
          `[robustGenerate] Fallback ${aiConfig.fallbackModel} also failed:`,
          fallbackError
        );
        return { text: "", error: `${errorMessage} (fallback: ${fallbackError})`, modelUsed: aiConfig.defaultModel };
      }
    }

    return { text: "", error: errorMessage, modelUsed: aiConfig.defaultModel };
  }
}
