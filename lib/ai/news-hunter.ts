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
        purpose: 'search',
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

    // 3. Last resort: trust the JSON URL if the search chunks were unhelpful
    if (!finalUrl && cleanJsonUrl) {
      finalUrl = cleanJsonUrl;
    }

    if (finalUrl) {
      story.url = finalUrl;
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
