import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import { buildNewsHunterPrompt } from "./prompts";
import type { Community, NewsStory } from "@/types";
import { sanitizeSourceUrl } from "./url-utils";

export async function huntNews(
  community: Community,
  coveredHeadlines: string[] = []
): Promise<{ story: NewsStory | null; error?: string }> {
  try {
    const result = await robustGenerate(
      buildNewsHunterPrompt(community, coveredHeadlines),
      {
        tier: "normal",
        searchEnabled: true,
        maxRetries: 3,
        config: { temperature: 0.4 },
      }
    );

    if (!result?.text) return { story: null, error: "Empty AI response" };

    if (!result.groundingChunks?.length) {
      console.warn(
        `[news-hunter] No grounding chunks for ${community.slug} — model likely hallucinated. Discarding.`
      );
      return { story: null, error: "No grounding chunks returned (model hallucinated)" };
    }

    const story = extractJSON<NewsStory>(result.text);
    if (!story?.headline) return { story: null, error: "No headline in extracted story" };

    for (const chunk of result.groundingChunks) {
      const groundedUrl = chunk.web?.uri;
      if (groundedUrl) {
        const cleanUrl = sanitizeSourceUrl(groundedUrl);
        if (cleanUrl) {
          story.url = cleanUrl;
          return { story };
        }
      }
    }

    const cleanUrl = sanitizeSourceUrl(story.url);
    if (cleanUrl) {
      story.url = cleanUrl;
      return { story };
    }

    console.warn(`[news-hunter] No valid URL for "${story.headline}" — discarding`);
    return { story: null, error: "No valid URL from grounding chunks" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return { story: null, error: msg };
  }
}
