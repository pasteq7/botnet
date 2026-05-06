import { robustGenerate, extractJSON } from "./client";
import { buildCommentPrompt } from "./prompts";
import type { Subreddit, Persona } from "@/types";

const FALLBACK_COMMENT = JSON.stringify({ body: "Content unavailable" });

export async function generateCommentChain(
  subreddit: Subreddit,
  personas: Persona[],
  thread: { title: string; body: string },
  commentCount = 8
): Promise<
  Array<{ persona: Persona; body: string; parentIndex: number | null }>
> {
  const results: Array<{
    persona: Persona;
    body: string;
    parentIndex: number | null;
  }> = [];
  const shuffled = [...personas].sort(() => Math.random() - 0.5);

  // Parallel generation for top-level comments
  const topLevelCount = Math.min(5, commentCount);
  const topLevelPromises = Array.from({ length: topLevelCount }).map(async (_, i) => {
    const persona = shuffled[i % shuffled.length];
    try {
      const response = await robustGenerate(
        buildCommentPrompt(
          subreddit,
          persona,
          thread.title,
          thread.body,
          ""
        ),
        {
          tier: "normal",
          config: { temperature: 0.9 },
          fallbackContent: FALLBACK_COMMENT,
        }
      );

      const parsed = extractJSON<{ body: string }>(response);
      if (parsed?.body) {
        return { persona, body: parsed.body, parentIndex: null };
      }
    } catch (err) {
      console.error(`[comment-gen] Top-level failed for ${persona.username}:`, err);
    }
    return null;
  });

  const topLevelResults = (await Promise.all(topLevelPromises)).filter((r): r is NonNullable<typeof r> => r !== null);
  results.push(...topLevelResults);

  // Parallel generation for replies
  if (results.length > 0) {
    const replyPromises = Array.from({ length: 3 }).map(async (_, i) => {
      const parentIndex = Math.floor(Math.random() * results.length);
      const parentComment = results[parentIndex];
      const replyPersona = shuffled[(i + 5) % shuffled.length];

      try {
        const response = await robustGenerate(
          buildCommentPrompt(
            subreddit,
            replyPersona,
            thread.title,
            thread.body,
            "",
            parentComment.body
          ),
          {
            tier: "normal",
            config: { temperature: 0.9 },
            fallbackContent: FALLBACK_COMMENT,
          }
        );

        const parsed = extractJSON<{ body: string }>(response);
        if (parsed?.body) {
          return { persona: replyPersona, body: parsed.body, parentIndex };
        }
      } catch (err) {
        console.error(
          `[comment-gen] Reply failed for ${replyPersona.username}:`,
          err
        );
      }
      return null;
    });

    const replyResults = (await Promise.all(replyPromises)).filter((r): r is NonNullable<typeof r> => r !== null);
    results.push(...replyResults);
  }

  return results;
}
