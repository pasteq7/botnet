import type { SearchProvider, SearchProviderId, SearchResult } from "@/types";
import { tavilyProvider } from "./providers/tavily";
import { braveProvider } from "./providers/brave";
import { serperProvider } from "./providers/serper";
import { exaProvider } from "./providers/exa";
import { googlePseProvider } from "./providers/google-pse";

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

export function deriveSearchQuery(topicPrompt: string, coveredHeadlines: string[]): string {
  const year = new Date().getFullYear();
  const exclusions = "-site:reddit.com -site:youtube.com";
  if (coveredHeadlines.length > 0) {
    const excludeTopics = coveredHeadlines.slice(0, 3).map((h) => `-${h.slice(0, 60)}`).join(" ");
    return `${topicPrompt} ${year} ${exclusions} ${excludeTopics}`;
  }
  return `${topicPrompt} ${year} ${exclusions}`;
}

export { type SearchProvider, type SearchProviderId, type SearchResult, type SearchStrategy, type Capability } from "@/types";
