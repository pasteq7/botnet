import type { SearchProvider, SearchResult } from "@/types";

export const exaProvider: SearchProvider = {
  id: "exa",
  label: "Exa",
  async search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ query, numResults: maxResults, type: "keyword" }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Exa API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const results = data.results ?? [];
    return results.map((r: { url?: string; title?: string; snippet?: string; publishedDate?: string }) => ({
      url: r.url ?? "",
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      publishedAt: r.publishedDate ?? undefined,
    }));
  },
};
