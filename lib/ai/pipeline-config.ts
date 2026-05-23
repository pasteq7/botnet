import { getActiveAiConfig, getActiveSearchConfig } from "@/lib/ai/client";
import type { ResolvedAiConfig, ResolvedPipelineConfig } from "@/lib/ai/config-types";
import type { AiRole, SearchMode, SearchStrategy } from "@/types";

function toResolved(config: NonNullable<Awaited<ReturnType<typeof getActiveAiConfig>>>, role: AiRole): ResolvedAiConfig {
  return {
    role,
    searchMode: (config as { searchMode?: SearchMode }).searchMode ?? 'none',
    provider: config.provider,
    model: config.defaultModel,
    fallbackModel: config.fallbackModel,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  };
}

export async function resolvePipelineConfig(): Promise<ResolvedPipelineConfig> {
  const [fullConfig, searcherConfig, generatorConfig, externalSearch] = await Promise.all([
    getActiveAiConfig('full'),
    getActiveAiConfig('searcher'),
    getActiveAiConfig('generator'),
    getActiveSearchConfig(),
  ]);

  const searcher = fullConfig ? toResolved(fullConfig, 'full') : searcherConfig ? toResolved(searcherConfig, 'searcher') : null;
  const generator = fullConfig ? toResolved(fullConfig, 'full') : generatorConfig ? toResolved(generatorConfig, 'generator') : null;

  const effectiveSearchStrategy: SearchStrategy = deriveSearchStrategy(searcher, externalSearch);

  console.log("[resolvePipelineConfig] Resolved:", {
    hasFull: !!fullConfig,
    hasSearcher: !!searcherConfig,
    hasGenerator: !!generatorConfig,
    hasExternalSearch: !!externalSearch,
    finalSearcher: searcher?.role || 'none',
    finalGenerator: generator?.role || 'none',
    strategy: effectiveSearchStrategy
  });

  return { searcher, generator, externalSearch, effectiveSearchStrategy };
}

export function deriveSearchStrategy(
  searcher: ResolvedAiConfig | null,
  externalSearch: { provider: string; apiKey: string | null } | null
): SearchStrategy {
  if (!searcher) return 'none';
  if (searcher.searchMode === 'native' || searcher.searchMode === 'native_with_fallback') return 'native';
  if (searcher.searchMode === 'external' && externalSearch && externalSearch.provider !== 'none') return 'injected';
  return 'none';
}
