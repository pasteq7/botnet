import type { SearchProvider, SearchResult } from "@/types";
import { fetchWithTimeout } from "@/lib/ai/fetch-utils";
import { retryWithBackoff } from "@/lib/ai/reliability";

export const serperProvider: SearchProvider = {
  id: "serper",
  label: "Serper",
  async search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    const response = await retryWithBackoff(
      () => fetchWithTimeout("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({ q: query, num: maxResults }),
      }, 20_000, "Serper search request failed"),
      { maxRetries: 2, baseDelayMs: 1_000, maxDelayMs: 10_000, tier: "fast" }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Serper API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const results = data.organic ?? [];
    return results.map((r: { link?: string; title?: string; snippet?: string; date?: string }) => ({
      url: r.link ?? "",
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      publishedAt: r.date ?? undefined,
    }));
  },
};
