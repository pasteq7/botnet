import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import { buildNewsHunterPrompt } from "./prompts";
import { buildGroundedPrompt } from "./build-grounded-prompt";
import type { Community, NewsStory, SearchResult } from "@/types";
import { sanitizeSourceUrl } from "./url-utils";

export async function huntNews(
  community: Community,
  coveredHeadlines: string[] = [],
  injectedResults?: SearchResult[]
): Promise<{ story: NewsStory | null; error?: string; tokensUsed?: number }> {
  try {
    const hasInjected = injectedResults !== undefined && injectedResults.length > 0;
    const prompt = hasInjected
      ? buildGroundedPrompt(buildNewsHunterPrompt(community, coveredHeadlines), injectedResults)
      : buildNewsHunterPrompt(community, coveredHeadlines);

    const result = await robustGenerate(
      prompt,
      {
        tier: "normal",
        maxRetries: 3,
        config: { temperature: 0.4 },
        role: hasInjected ? 'generator' : 'searcher',
        searchMode: hasInjected ? 'none' : 'native',
      }
    );

    if (!result?.text) {
      const queries = result?.searchQueries?.length ? ` Queries: [${result.searchQueries.join(", ")}]` : "";
      const grounding = result?.groundingChunks !== undefined ? ` Grounding chunks: ${result.groundingChunks.length}` : "";
      const err = result?.error ? ` Error: ${result.error}` : "";
      return { story: null, error: `Empty AI response${queries}${grounding}${err}`, tokensUsed: result?.tokensUsed };
    }

    if (hasInjected && result) {
      result.groundingChunks = injectedResults.map(r => ({
        web: { uri: r.url, title: r.title },
      }));
    }

    if (!result.groundingChunks?.length) {
      const queries = result.searchQueries?.length ? ` Queries: [${result.searchQueries.join(", ")}]` : "";
      console.warn(
        `[news-hunter] No grounding chunks for ${community.slug} — model likely hallucinated. Discarding.${queries}`
      );
      return { story: null, error: `No grounding chunks returned (model hallucinated)${queries}`, tokensUsed: result.tokensUsed };
    }

    const story = extractJSON<NewsStory>(result.text);
    if (!story?.headline) return { story: null, error: `No headline in extracted story. Raw: ${result.text.slice(0, 200)}`, tokensUsed: result.tokensUsed };

    const cleanJsonUrl = sanitizeSourceUrl(story.url);
    let finalUrl: string | null = null;

    // 1. Try to see if the AI's chosen JSON URL exists anywhere in the search context
    if (cleanJsonUrl) {
      const isGrounded = result.groundingChunks.some(chunk => {
        const chunkUrl = chunk.web?.uri;
        return chunkUrl && (chunkUrl.includes(cleanJsonUrl) || cleanJsonUrl.includes(chunkUrl));
      });
      if (isGrounded) finalUrl = cleanJsonUrl;
    }

    // 2. If no direct match, fallback to the first valid grounding chunk
    if (!finalUrl) {
      for (const chunk of result.groundingChunks) {
        const groundedUrl = chunk.web?.uri;
        if (groundedUrl) {
          const cleanUrl = sanitizeSourceUrl(groundedUrl);
          if (cleanUrl) {
            finalUrl = cleanUrl;
            break;
          }
        }
      }
    }

    // 3. Last resort: verify the JSON URL with a HEAD request
    if (!finalUrl && cleanJsonUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(cleanJsonUrl, { method: "HEAD", signal: controller.signal });
        clearTimeout(timer);
        if (res.ok || res.status === 405 || res.status === 403) {
          finalUrl = cleanJsonUrl;
        }
      } catch {
        // unreachable, discard
      }
    }

    if (finalUrl) {
      story.url = finalUrl;
      return { story, tokensUsed: result.tokensUsed };
    }

    console.warn(`[news-hunter] No valid URL for "${story.headline}" — discarding`);
    return { story: null, error: "No valid URL from grounding chunks", tokensUsed: result.tokensUsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return { story: null, error: msg };
  }
}
