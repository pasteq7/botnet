import { robustGenerate, extractJSON, getGeminiClient } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Community, NewsStory } from "@/types";

const KNOWN_RELIABLE_DOMAINS = [
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
  "theguardian.com", "nature.com", "science.org", "ft.com",
];

async function validateUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

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
    const story = extractJSON<NewsStory>(response);
    if (!story) return null;

    // Validate URL — drop it if broken, keep story without URL
    if (story.url) {
      const domain = extractDomain(story.url);
      const isTrustedDomain = KNOWN_RELIABLE_DOMAINS.some(d => domain.endsWith(d));

      if (!isTrustedDomain) {
        const isValid = await validateUrl(story.url);
        if (!isValid) {
          console.warn(`[news-hunter] Dropping invalid URL: ${story.url}`);
          story.url = ""; // Keep the story, ditch the broken link
        }
      }
    }

    return story;
  } catch (err) {
    console.error(`[news-hunter] Failed for ${community.slug}:`, err);
    return null;
  }
}