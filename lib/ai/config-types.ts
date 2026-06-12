import type { AiRole, SearchMode, SearchStrategy, SearchProviderId } from "@/types";

export interface ResolvedAiConfig {
  role: AiRole;
  searchMode: SearchMode;
  provider: string;
  model: string;
  fallbackModel: string | null;
  apiKey: string;
  baseUrl: string | null;
}

export interface ExternalSearchConfig {
  provider: SearchProviderId;
  apiKey: string | null;
}

export interface ResolvedGenerationConfig {
  searcher: ResolvedAiConfig | null;
  generator: ResolvedAiConfig | null;
  externalSearch: ExternalSearchConfig | null;
  effectiveSearchStrategy: SearchStrategy;
}

export type ResolvedAiConfigMetadata = Omit<ResolvedAiConfig, "apiKey">;
export type ExternalSearchConfigMetadata = Omit<ExternalSearchConfig, "apiKey">;

export interface ResolvedGenerationConfigMetadata {
  searcher: ResolvedAiConfigMetadata | null;
  generator: ResolvedAiConfigMetadata | null;
  externalSearch: ExternalSearchConfigMetadata | null;
  effectiveSearchStrategy: SearchStrategy;
}
