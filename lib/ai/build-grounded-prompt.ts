import type { SearchResult } from "./search/types";

export function buildGroundedPrompt(contents: string, results: SearchResult[]): string {
  if (!results?.length) return contents;

  const context = results
    .map((r, i) => {
      let entry = `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`;
      if (r.publishedAt) entry += `\nPublished: ${r.publishedAt}`;
      return entry;
    })
    .join("\n\n");

  return `${contents}\n\n---\nSEARCH RESULTS (use these as your sources):\n${context}\n---`;
}
