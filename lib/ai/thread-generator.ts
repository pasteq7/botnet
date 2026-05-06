import { robustGenerate, extractJSON } from "./client";
import { buildThreadPrompt } from "./prompts";
import type { Subreddit, Persona, NewsStory, GeneratedThread } from "@/types";

export async function generateThread(
  subreddit: Subreddit,
  persona: Persona,
  story: NewsStory
): Promise<GeneratedThread | null> {
  try {
    const response = await robustGenerate(
      buildThreadPrompt(subreddit, persona, story),
      {
        tier: "normal",
        config: { temperature: 0.8 },
      }
    );

    if (!response) return null;
    return extractJSON<GeneratedThread>(response);
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return null;
  }
}
