import type { SearchProvider, SearchResult } from "../types";

export const tavilyProvider: SearchProvider = {
  id: "tavily",
  label: "Tavily",
  async search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: false,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Tavily API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    return (data.results ?? []).map((r: { url?: string; title?: string; content?: string; published_date?: string }) => ({
      url: r.url ?? "",
      title: r.title ?? "",
      snippet: r.content ?? "",
      publishedAt: r.published_date ?? undefined,
    }));
  },
};
