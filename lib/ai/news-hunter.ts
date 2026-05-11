import { robustGenerate, extractJSON } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Community, NewsStory } from "@/types";
import { sanitizeSourceUrl, buildFallbackUrl } from "./url-utils";

export async function huntNews(
  community: Community,
  coveredHeadlines: string[] = []
): Promise<NewsStory | null> {
  try {
    const response = await robustGenerate(
      buildNewsHunterPrompt(community, coveredHeadlines),
      {
        tier: "normal",
        searchEnabled: true,
        config: { temperature: 0.4 },
      }
    );

    if (!response) return null;
    const story = extractJSON<NewsStory>(response);
    if (!story?.headline) return null;

    const cleanUrl = sanitizeSourceUrl(story.url);
    story.url = cleanUrl ?? buildFallbackUrl(story.headline);
    return story;
  } catch (err) {
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return null;
  }
}
