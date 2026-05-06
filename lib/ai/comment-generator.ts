import { robustGenerate, extractJSON } from "./client";
import { buildCommentPrompt } from "./prompts";
import type { Subreddit, Persona } from "@/types";

const FALLBACK_COMMENT = JSON.stringify({ body: "Content unavailable" });

const COMMENT_ROLES = [
  { role: "skeptic", instruction: "Question the premise or offer a brief counterpoint." },
  { role: "joker", instruction: "Add a lighthearted or witty observation." },
  { role: "supporter", instruction: "Support the OP with a quick anecdote or agreement." },
  { role: "elaborator", instruction: "Add a relevant detail or angle the OP missed." },
  { role: "questioner", instruction: "Ask a genuine, specific question about the post." },
  { role: "experiencer", instruction: "Share a brief personal experience related to the topic." },
  { role: "contrarian", instruction: "Disagree respectfully with a specific point." },
  { role: "summarizer", instruction: "Summarize the overall sentiment in a fresh way." },
];

export async function generateCommentChain(
  subreddit: Subreddit,
  personas: Persona[],
  thread: { title: string; body: string },
  opPersonaId: string,
  commentCount = 8
): Promise<
  Array<{ persona: Persona; body: string; parentIndex: number | null }>
> {
  const results: Array<{
    persona: Persona;
    body: string;
    parentIndex: number | null;
  }> = [];
  const usedPersonaIds = new Set<string>([opPersonaId]);

  for (let i = 0; i < commentCount; i++) {
    const available = personas.filter((p) => !usedPersonaIds.has(p.id));
    if (available.length === 0) break;

    const persona = available[Math.floor(Math.random() * available.length)];
    usedPersonaIds.add(persona.id);

    const { instruction } = COMMENT_ROLES[i % COMMENT_ROLES.length];

    // First 4 comments are top-level; remaining are replies
    let parentIndex: number | null = null;
    if (i >= 4 && results.length > 0) {
      parentIndex = Math.floor(Math.random() * results.length);
    }

    const parentComment = parentIndex !== null ? results[parentIndex] : null;

    const existingCommentsText = results
      .map((r, idx) => `[${idx}] ${r.persona.username}: "${r.body}"`)
      .join("\n");

    try {
      const response = await robustGenerate(
        buildCommentPrompt(
          subreddit,
          persona,
          thread.title,
          thread.body,
          existingCommentsText,
          parentComment?.body ?? null,
          instruction
        ),
        {
          tier: "normal",
          config: { temperature: 0.9 },
          fallbackContent: FALLBACK_COMMENT,
        }
      );

      const parsed = extractJSON<{ body: string }>(response);
      if (parsed?.body) {
        results.push({ persona, body: parsed.body, parentIndex });
      }
    } catch (err) {
      console.error(`[comment-gen] Failed for ${persona.username}:`, err);
    }
  }

  return results;
}
