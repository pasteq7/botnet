// lib\ai\web-search-generator.ts
import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { languageInstruction, naturalVoiceInstruction } from "@/lib/ai/prompts";
import { buildGroundedPrompt } from "@/lib/ai/build-grounded-prompt";
import { sanitizeSourceUrl, buildFallbackUrl, resolveProxyUrl } from "@/lib/ai/url-utils";
import type { Community, ContentPayload, SearchResult } from "@/types";
import { fetchWithTimeout } from "@/lib/ai/fetch-utils";

export async function generateWebSearchPost(
  community: Community,
  coveredHeadlines: string[],
  injectedResults?: SearchResult[]
): Promise<{ payload: ContentPayload | null; error?: string; tokensUsed?: number; rawResponse?: string }> {
  try {
    const hasInjected = injectedResults !== undefined && injectedResults.length > 0;
    const isWiki = community.name.toLowerCase().includes("wikipedia") || (community.topic_prompt || "").toLowerCase().includes("wikipedia");
    const isGithub = community.name.toLowerCase().includes("github") || (community.topic_prompt || "").toLowerCase().includes("github");

    let searchInstruction = "search for a specific, compelling web page related to the community topic.";
    if (isWiki) searchInstruction = `search ONLY using the operator "site:wikipedia.org" (e.g. "site:wikipedia.org obscure history"). DO NOT search general news or other sites.`;
    if (isGithub) searchInstruction = `search ONLY using the operator "site:github.com" (e.g. "site:github.com awesome tools"). DO NOT search general news or other sites.`;

    const prompt = hasInjected
      ? buildGroundedPrompt(`
You are a content curator for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

${isWiki ? 'Focus on Wikipedia articles from the search results below.' : ''}
${isGithub ? 'Focus on GitHub repositories from the search results below.' : ''}

Find the single most interesting, discussion-worthy page from the search results below. This does NOT have to be breaking news.

The "url" in your JSON MUST be a URL from the search results. Do NOT invent URLs.

${coveredHeadlines.length > 0
          ? `ALREADY COVERED (skip these topics):\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
          : ""}

Rules:
- Prefer primary sources over aggregators.
- Pick something surprising, underexplored, or newly relevant, not the most obvious result.
- Avoid paywalled content.

Return ONLY valid JSON, no markdown:
{
  "headline": "descriptive title framing why this page is interesting",
  "summary": "2-3 sentences explaining what the page is and why it matters to this community",
  "url": "direct URL to the page",
  "angle": "the specific hook that makes this worth posting",
  "why_interesting": "one sentence on why this community would engage"
}
`, injectedResults)
      : `
You are a content curator for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

CRITICAL INSTRUCTION: You MUST invoke the Google Search tool to find a real, live, publicly accessible URL. 
Do NOT rely on your internal training data.

SEARCH STRATEGY:
You must ${searchInstruction}

Find the single most interesting, discussion-worthy page. This does NOT have to be breaking news.

The "url" in your JSON MUST be the direct, canonical URL from the search results (e.g., https://en.wikipedia.org/wiki/... or https://github.com/...). Do NOT use proxy links.

${coveredHeadlines.length > 0
          ? `ALREADY COVERED (skip these topics):\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
          : ""}

Rules:
- Prefer primary sources over aggregators.
- Pick something surprising, underexplored, or newly relevant, not the most obvious result.
- Avoid paywalled content.

Return ONLY valid JSON, no markdown:
{
  "headline": "descriptive title framing why this page is interesting",
  "summary": "2-3 sentences explaining what the page is and why it matters to this community",
  "url": "direct URL to the page",
  "angle": "the specific hook that makes this worth posting",
  "why_interesting": "one sentence on why this community would engage"
}
`;

    const result = await robustGenerate(prompt, {
      tier: "normal",
      maxRetries: 3,
      config: { temperature: hasInjected ? 0.3 : 0.5 },
      role: hasInjected ? 'generator' : 'searcher',
      searchMode: hasInjected ? 'none' : 'native',
    });

    if (!result?.text) {
      const queries = result?.searchQueries?.length ? ` Queries: [${result.searchQueries.join(", ")}]` : "";
      const grounding = result?.groundingChunks !== undefined ? ` Grounding chunks: ${result.groundingChunks.length}` : "";
      const err = result?.error ? ` Error: ${result.error}` : "";
      return { payload: null, error: `Empty AI response${queries}${grounding}${err}`, tokensUsed: result?.tokensUsed };
    }

    if (hasInjected && result) {
      result.groundingChunks = injectedResults.map(r => ({
        web: { uri: r.url, title: r.title },
      }));
    }

    if (!result.groundingChunks?.length) {
      const queries = result.searchQueries?.length ? ` Queries: [${result.searchQueries.join(", ")}]` : "";
      return { 
        payload: null, 
        error: `No grounding chunks returned (model hallucinated or refused to search)${queries}`, 
        tokensUsed: result.tokensUsed,
        rawResponse: result.text
      };
    }

    const parsed = extractJSON<Omit<ContentPayload, "mode">>(result.text);
    if (!parsed?.headline) return { payload: null, error: `No headline in extracted payload. Raw: ${result.text.slice(0, 200)}`, tokensUsed: result.tokensUsed };

    let finalUrl: string | null = null;

    // 1. Resolve proxy URLs from grounding chunks to their real destinations (parallelized)
    const resolvedChunks: Array<{ url: string, title: string }> = [];
    const validChunks = result.groundingChunks.filter(c => c.web?.uri);
    if (validChunks.length > 0) {
      const resolved = await Promise.all(
        validChunks.map(async (chunk) => {
          const realUrl = await resolveProxyUrl(chunk.web!.uri);
          return { url: sanitizeSourceUrl(realUrl) || realUrl, title: chunk.web!.title || "" };
        })
      );
      resolvedChunks.push(...resolved);
    }

    // 2. Prioritize strict domain matches from the grounded data
    if (isWiki) {
      const match = resolvedChunks.find(c => c.url.includes("wikipedia.org") || c.title.includes("Wikipedia"));
      if (match) finalUrl = match.url;
    } else if (isGithub) {
      const match = resolvedChunks.find(c => c.url.includes("github.com") || c.title.includes("GitHub"));
      if (match) finalUrl = match.url;
    } else {
      // Normal community: just take the first valid resolved chunk
      if (resolvedChunks.length > 0) finalUrl = resolvedChunks[0].url;
    }

    // 3. Fallback to the URL the AI provided in JSON (but verify it exists so we don't post 404s)
    if (!finalUrl && parsed?.url) {
      const cleanParsed = sanitizeSourceUrl(parsed.url) || parsed.url;
      let candidateUrl: string | null = null;

      if (isWiki && cleanParsed.includes("wikipedia.org")) candidateUrl = cleanParsed;
      else if (isGithub && cleanParsed.includes("github.com")) candidateUrl = cleanParsed;
      else if (!isWiki && !isGithub) candidateUrl = cleanParsed;

      if (candidateUrl) {
        try {
          const res = await fetchWithTimeout(candidateUrl, { method: 'HEAD' }, 4_000, "Candidate URL check failed");
          // 200, 405 (Method Not Allowed for bots), or 403 (Forbidden for bots) mean the server exists.
          if (res.ok || res.status === 405 || res.status === 403) {
            finalUrl = candidateUrl;
          }
        } catch {
          // Fetch failed, assume URL was hallucinated
        }
      }
    }

    // 4. Strict Rejections
    if (isWiki && (!finalUrl || !finalUrl.includes("wikipedia.org"))) {
      return { payload: null, error: "Search tool did not return a valid Wikipedia article." };
    }
    if (isGithub && (!finalUrl || !finalUrl.includes("github.com"))) {
      return { payload: null, error: "Search tool did not return a valid GitHub repository." };
    }

    // 5. Global fallback
    if (!finalUrl) {
      finalUrl = buildFallbackUrl(parsed.headline);
    }

    return {
      payload: { ...parsed, url: finalUrl, mode: "web-search" },
      tokensUsed: result.tokensUsed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[web-search-generator] Failed for ${community.slug}:`, err);
    return { payload: null, error: msg };
  }
}
