import type { SearchProvider, SearchResult } from "@/types";
import { fetchWithTimeout } from "@/lib/ai/fetch-utils";
import { retryWithBackoff } from "@/lib/ai/reliability";

export const braveProvider: SearchProvider = {
  id: "brave",
  label: "Brave Search",
  async search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    const params = new URLSearchParams({ q: query, count: String(maxResults) });
    const response = await retryWithBackoff(
      () => fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }, 20_000, "Brave search request failed"),
      { maxRetries: 2, baseDelayMs: 1_000, maxDelayMs: 10_000, tier: "fast" }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Brave API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const results = data.web?.results ?? [];
    return results.map((r: { url?: string; title?: string; description?: string; age?: string }) => ({
      url: r.url ?? "",
      title: r.title ?? "",
      snippet: r.description ?? "",
      publishedAt: r.age ?? undefined,
    }));
  },
};
