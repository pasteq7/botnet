import { robustGenerate, extractJSON, getGeminiClient } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Community, NewsStory } from "@/types";
import { sanitizeSourceUrl } from "./url-utils";

export async function huntNews(
  community: Community,
  coveredHeadlines: string[] = []
): Promise<NewsStory | null> {
  try {
    const response = await robustGenerate(
      buildNewsHunterPrompt(community, coveredHeadlines),
      {
        tier: "normal",
        config: { tools: [{ googleSearch: {} }], temperature: 0.4 },
      }
    );

    if (!response) return null;
    const story = extractJSON<NewsStory>(response);
    if (!story) return null;

    story.url = sanitizeSourceUrl(story.url) ?? "";
    return story;
  } catch (err) {
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return null;
  }
}
