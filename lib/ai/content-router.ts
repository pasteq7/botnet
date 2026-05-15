import type { Community, ContentMode, ContentPayload, SearchResult } from "@/types";
import { huntNews } from "./news-hunter";
import { generateDiscussionPrompt } from "./discussion-generator";
import { generateTipPost } from "./tip-generator";
import { generateWebSearchPost } from "./web-search-generator";

/**
 * Weighted random pick from the community's content_mode_weights.
 */
export function pickContentMode(community: Community): ContentMode {
  const weights = community.content_mode_weights ?? { news: 1.0 };
  const entries = Object.entries(weights) as [ContentMode, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;

  for (const [mode, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return mode;
  }

  return entries[0][0];
}

export interface RouteOptions {
  injectedSearchResults?: SearchResult[];
}

/**
 * Routes to the right generator based on mode.
 * Returns a normalized ContentPayload (superset of NewsStory).
 * When injectedSearchResults is provided, generators use them as grounding
 * instead of relying on the LLM's native search.
 */
export async function routeContentGeneration(
  community: Community,
  coveredHeadlines: string[],
  mode?: ContentMode,
  options?: RouteOptions
): Promise<{ payload: ContentPayload | null; error?: string; tokensUsed?: number; rawResponse?: string }> {
  const resolvedMode = mode ?? pickContentMode(community);

  switch (resolvedMode) {
    case "news": {
      const { story, error, tokensUsed, rawResponse } = await huntNews(community, coveredHeadlines, options?.injectedSearchResults);
      if (!story) return { payload: null, error: error ?? "huntNews returned no content", tokensUsed, rawResponse };
      return { payload: { ...story, mode: "news" }, tokensUsed };
    }

    case "discussion":
      try {
        const result = await generateDiscussionPrompt(community, coveredHeadlines);
        return { payload: result, tokensUsed: result?.tokensUsed };
      } catch (err) {
        return { payload: null, error: `discussion: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "tips":
      try {
        const result = await generateTipPost(community, coveredHeadlines);
        return { payload: result, tokensUsed: result?.tokensUsed };
      } catch (err) {
        return { payload: null, error: `tips: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "ask":
      try {
        const result = await generateDiscussionPrompt(community, coveredHeadlines, "ask");
        return { payload: result, tokensUsed: result?.tokensUsed };
      } catch (err) {
        return { payload: null, error: `ask: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "web-search": {
      const result = await generateWebSearchPost(community, coveredHeadlines, options?.injectedSearchResults);
      if (!result.payload) return { payload: null, error: result.error ?? "web-search generator returned no content", tokensUsed: result.tokensUsed, rawResponse: result.rawResponse };
      return { payload: result.payload, tokensUsed: result.tokensUsed };
    }

    default: {
      console.warn(`[content-router] Unknown mode "${resolvedMode}", falling back to discussion`);
      const result = await generateDiscussionPrompt(community, coveredHeadlines);
      return { payload: result, error: result ? undefined : "Unknown mode fallback to discussion failed", tokensUsed: result?.tokensUsed };
    }
  }
}
