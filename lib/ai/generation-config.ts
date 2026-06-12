import {
  getActiveAiConfig,
  getActiveAiConfigMetadata,
  getActiveSearchConfig,
  getActiveSearchConfigMetadata,
} from "@/lib/ai/client";
import type {
  ResolvedAiConfig,
  ResolvedAiConfigMetadata,
  ResolvedGenerationConfig,
  ResolvedGenerationConfigMetadata,
} from "@/lib/ai/config-types";
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

function toResolvedMetadata(
  config: NonNullable<Awaited<ReturnType<typeof getActiveAiConfigMetadata>>>,
  role: AiRole
): ResolvedAiConfigMetadata {
  return {
    role,
    searchMode: (config as { searchMode?: SearchMode }).searchMode ?? 'none',
    provider: config.provider,
    model: config.defaultModel,
    fallbackModel: config.fallbackModel,
    baseUrl: config.baseUrl,
  };
}

export async function resolveGenerationConfig(): Promise<ResolvedGenerationConfig> {
  const [fullConfig, searcherConfig, generatorConfig, externalSearch] = await Promise.all([
    getActiveAiConfig('full'),
    getActiveAiConfig('searcher'),
    getActiveAiConfig('generator'),
    getActiveSearchConfig(),
  ]);

  const searcher = fullConfig ? toResolved(fullConfig, 'full') : searcherConfig ? toResolved(searcherConfig, 'searcher') : null;
  const generator = fullConfig ? toResolved(fullConfig, 'full') : generatorConfig ? toResolved(generatorConfig, 'generator') : null;

  const effectiveSearchStrategy: SearchStrategy = deriveSearchStrategy(searcher, externalSearch);

  return { searcher, generator, externalSearch, effectiveSearchStrategy };
}

export async function resolveGenerationConfigMetadata(): Promise<ResolvedGenerationConfigMetadata> {
  const [fullConfig, searcherConfig, generatorConfig, externalSearch] = await Promise.all([
    getActiveAiConfigMetadata('full'),
    getActiveAiConfigMetadata('searcher'),
    getActiveAiConfigMetadata('generator'),
    getActiveSearchConfigMetadata(),
  ]);

  const searcher = fullConfig
    ? toResolvedMetadata(fullConfig, 'full')
    : searcherConfig
      ? toResolvedMetadata(searcherConfig, 'searcher')
      : null;
  const generator = fullConfig
    ? toResolvedMetadata(fullConfig, 'full')
    : generatorConfig
      ? toResolvedMetadata(generatorConfig, 'generator')
      : null;
  const effectiveSearchStrategy = deriveSearchStrategy(searcher, externalSearch);

  return { searcher, generator, externalSearch, effectiveSearchStrategy };
}

export function deriveSearchStrategy(
  searcher: Pick<ResolvedAiConfig, "searchMode"> | null,
  externalSearch: { provider: string } | null
): SearchStrategy {
  if (!searcher) return 'none';
  if (searcher.searchMode === 'native' || searcher.searchMode === 'native_with_fallback') return 'native';
  if (searcher.searchMode === 'external' && externalSearch && externalSearch.provider !== 'none') return 'injected';
  return 'none';
}
