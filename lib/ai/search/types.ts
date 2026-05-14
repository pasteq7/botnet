export type SearchProviderId = 'tavily' | 'brave' | 'serper' | 'exa' | 'google_pse' | 'none';

export type SearchStrategy = 'provider_native' | 'injected' | 'none';

export type Capability = 'generation' | 'native_search' | 'tool_calling';
export type AiRole = 'generator' | 'searcher' | 'full';
export type SearchMode = 'none' | 'native' | 'external' | 'native_with_fallback';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchProvider {
  id: SearchProviderId;
  label: string;
  search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]>;
}

export interface ActiveSearchConfig {
  provider: SearchProviderId;
  apiKey: string | null;
}
