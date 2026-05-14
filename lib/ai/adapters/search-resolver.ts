import type { SearchMode } from "@/types";

export interface ResolvedSearchConfig {
  model: string;
  config: Record<string, unknown> | undefined;
  endpoint: string | undefined;
  isSearchEnabled: boolean;
}

const SUPPORTED_MISTRAL_WEB_SEARCH_MODELS = ["mistral-large"];

export function resolveAdapterSearchConfig(
  provider: string,
  model: string,
  searchMode?: SearchMode,
  searchEnabled?: boolean,
  baseConfig?: Record<string, unknown>
): ResolvedSearchConfig {
  const resolvedSearchMode: SearchMode = searchMode ?? (searchEnabled ? 'native' : 'none');
  const isSearchEnabled = resolvedSearchMode === 'native' || resolvedSearchMode === 'native_with_fallback';

  let resolvedModel = model;
  let resolvedConfig = baseConfig ? { ...baseConfig } : undefined;
  let endpoint: string | undefined;

  if (!isSearchEnabled) {
    const cleaned = searchEnabled === false && resolvedConfig?.tools
      ? stripGoogleSearchTools(resolvedConfig)
      : resolvedConfig;
    return { model: resolvedModel, config: cleaned, endpoint: undefined, isSearchEnabled: false };
  }

  if (provider === "openrouter") {
    const existingTools = Array.isArray(resolvedConfig?.tools) ? resolvedConfig.tools : [];
    resolvedConfig = { ...(resolvedConfig ?? {}), tools: [...existingTools, { type: "openrouter:web_search" }] };
  } else if (provider === "mistral") {
    const existingTools = Array.isArray(resolvedConfig?.tools) ? resolvedConfig.tools : [];
    resolvedConfig = { ...(resolvedConfig ?? {}), tools: [...existingTools, { type: "web_search" }] };

    const isSupported = SUPPORTED_MISTRAL_WEB_SEARCH_MODELS.some((m) => resolvedModel.includes(m));
    if (!isSupported) {
      console.warn(
        `[search-resolver] Mistral model ${resolvedModel} does not support web search. Upgrading to mistral-large-latest.`
      );
      resolvedModel = "mistral-large-latest";
    }
    endpoint = "/conversations";
  } else if (provider === "gemini") {
    const existingTools = Array.isArray(resolvedConfig?.tools) ? resolvedConfig.tools : [];
    resolvedConfig = { ...(resolvedConfig ?? {}), tools: [...existingTools, { googleSearch: {} }] };
  }

  if (provider !== "gemini" && resolvedConfig?.tools) {
    resolvedConfig = stripGoogleSearchTools(resolvedConfig);
  }

  return { model: resolvedModel, config: resolvedConfig, endpoint, isSearchEnabled };
}

function stripGoogleSearchTools(config: Record<string, unknown>): Record<string, unknown> {
  const tools = config.tools as Array<Record<string, unknown>> | undefined;
  if (!tools) return config;

  const filtered = tools.filter((t) => !t.googleSearch);
  if (filtered.length === 0) {
    const cleaned = { ...config };
    delete cleaned.tools;
    return cleaned;
  }
  return { ...config, tools: filtered };
}
