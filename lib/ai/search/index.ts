import type { SearchProvider, SearchProviderId, SearchResult } from "@/types";
import { tavilyProvider } from "@/lib/ai/search/providers/tavily";
import { braveProvider } from "@/lib/ai/search/providers/brave";
import { serperProvider } from "@/lib/ai/search/providers/serper";
import { exaProvider } from "@/lib/ai/search/providers/exa";
import { googlePseProvider } from "@/lib/ai/search/providers/google-pse";

const providerMap: Record<SearchProviderId, SearchProvider> = {
  tavily: tavilyProvider,
  brave: braveProvider,
  serper: serperProvider,
  exa: exaProvider,
  google_pse: googlePseProvider,
  none: {
    id: "none",
    label: "None",
    async search(): Promise<SearchResult[]> {
      return [];
    },
  },
};

export function getSearchProvider(id: SearchProviderId): SearchProvider {
  const provider = providerMap[id];
  if (!provider) {
    throw new Error(`Unknown search provider: "${id}"`);
  }
  return provider;
}

export function deriveSearchQuery(
  topicPrompt: string,
  coveredHeadlines: string[],
  searchScope?: string | null
): string {
  const year = new Date().getFullYear();
  const dedup = coveredHeadlines.length > 0
    ? ` -${coveredHeadlines.slice(0, 3).join(" -")}`
    : "";
  const site = searchScope ? ` site:${searchScope}` : "";
  return `${topicPrompt} ${year}${site}${dedup}`;
}

export { type SearchProvider, type SearchProviderId, type SearchResult, type SearchStrategy, type Capability } from "@/types";
