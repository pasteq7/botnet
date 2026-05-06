import { robustGenerate, extractJSON } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Subreddit, NewsStory } from "@/types";

export async function huntNews(
  subreddit: Subreddit,
  coveredHeadlines: string[] = []
): Promise<NewsStory | null> {
  try {
    const response = await robustGenerate(
      buildNewsHunterPrompt(subreddit, coveredHeadlines),
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
    console.error(`[news-hunter] Failed for ${subreddit.slug}:`, err);
    return null;
  }
}
