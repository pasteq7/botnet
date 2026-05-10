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
): Promise<ContentPayload | null> {
  const resolvedMode = mode ?? pickContentMode(community);

  switch (resolvedMode) {
    case "news":
      const story = await huntNews(community, coveredHeadlines);
      if (!story) return null;
      return { ...story, mode: "news" };

    case "historical":
      return generateHistoricalTopic(community, coveredHeadlines);

    case "discussion":
      return generateDiscussionPrompt(community, coveredHeadlines);

    case "tips":
      return generateTipPost(community, coveredHeadlines);

    case "showcase":
      return generateDiscussionPrompt(community, coveredHeadlines, "showcase");

    case "ask":
      return generateDiscussionPrompt(community, coveredHeadlines, "ask");

    case "web-search":
      return generateWebSearchPost(community, coveredHeadlines);

    default:
      const defaultStory = await huntNews(community, coveredHeadlines);
      if (!defaultStory) return null;
      return { ...defaultStory, mode: "news" };
  }
}
