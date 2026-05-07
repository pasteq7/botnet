import { robustGenerate, extractJSON } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Community, NewsStory } from "@/types";

export async function huntNews(
  community: Community,
  coveredHeadlines: string[] = []
): Promise<NewsStory | null> {
  try {
    const response = await robustGenerate(
      buildNewsHunterPrompt(community, coveredHeadlines),
      {
        tier: "normal",
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.4,
        },
      }
    );

    if (!response) return null;
    return extractJSON<NewsStory>(response);
  } catch (err) {
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return null;
  }
}
