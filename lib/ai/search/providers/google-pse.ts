import type { SearchProvider, SearchResult } from "@/types";

export const googlePseProvider: SearchProvider = {
  id: "google_pse",
  label: "Google PSE",
  async search(query: string, apiKey: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;
    const params = new URLSearchParams({
      key: apiKey,
      cx: process.env.GOOGLE_PSE_CX ?? "",
      q: query,
      num: String(maxResults),
    });

    if (!process.env.GOOGLE_PSE_CX) {
      throw new Error("Google PSE requires GOOGLE_PSE_CX environment variable");
    }

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      method: "GET",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Google PSE API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const items = data.items ?? [];
    return items.map((r: { link?: string; title?: string; snippet?: string; pagemap?: { metatags?: Array<{ date?: string }> } }) => ({
      url: r.link ?? "",
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      publishedAt: r.pagemap?.metatags?.[0]?.date ?? undefined,
    }));
  },
};
