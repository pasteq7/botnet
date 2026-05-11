import type { Community, ContentMode, ContentPayload } from "@/types";
import { huntNews } from "./news-hunter";
import { generateHistoricalTopic } from "./historical-generator";
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

/**
 * Routes to the right generator based on mode.
 * Returns a normalized ContentPayload (superset of NewsStory).
 */
export async function routeContentGeneration(
  community: Community,
  coveredHeadlines: string[],
  mode?: ContentMode
): Promise<{ payload: ContentPayload | null; error?: string }> {
  const resolvedMode = mode ?? pickContentMode(community);

  switch (resolvedMode) {
    case "news": {
      const { story, error } = await huntNews(community, coveredHeadlines);
      if (!story) return { payload: null, error: error ?? "huntNews returned no content" };
      return { payload: { ...story, mode: "news" } };
    }

    case "historical":
      try {
        const payload = await generateHistoricalTopic(community, coveredHeadlines);
        return { payload };
      } catch (err) {
        return { payload: null, error: `historical: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "discussion":
      try {
        const payload = await generateDiscussionPrompt(community, coveredHeadlines);
        return { payload };
      } catch (err) {
        return { payload: null, error: `discussion: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "tips":
      try {
        const payload = await generateTipPost(community, coveredHeadlines);
        return { payload };
      } catch (err) {
        return { payload: null, error: `tips: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "showcase":
      try {
        const payload = await generateDiscussionPrompt(community, coveredHeadlines, "showcase");
        return { payload };
      } catch (err) {
        return { payload: null, error: `showcase: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "ask":
      try {
        const payload = await generateDiscussionPrompt(community, coveredHeadlines, "ask");
        return { payload };
      } catch (err) {
        return { payload: null, error: `ask: ${err instanceof Error ? err.message : String(err)}` };
      }

    case "web-search": {
      const result = await generateWebSearchPost(community, coveredHeadlines);
      if (!result.payload) return { payload: null, error: result.error ?? "web-search generator returned no content" };
      return { payload: result.payload };
    }

    default: {
      const { story, error } = await huntNews(community, coveredHeadlines);
      if (!story) return { payload: null, error: error ?? "huntNews (default mode) returned no content" };
      return { payload: { ...story, mode: "news" } };
    }
  }
}
