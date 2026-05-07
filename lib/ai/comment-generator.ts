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
): Promise<Array<{ persona: Persona; body: string; parentIndex: number | null }>> {

  const pool = personas
    .filter((p) => p.id !== opPersonaId)
    .sort(() => Math.random() - 0.5);

  const count = Math.min(commentCount, 10, pool.length);

  // Pre-assign roles and parent indices before any async work
  const tasks = Array.from({ length: count }, (_, i) => ({
    persona: pool[i],
    instruction: COMMENT_ROLES[i % COMMENT_ROLES.length].instruction,
    // replies reference an earlier index; top-level comments don't
    parentIndex: i >= 4 ? Math.floor(Math.random() * i) : null,
  }));

  const results: Array<{ persona: Persona; body: string; parentIndex: number | null }> =
    new Array(count).fill(null);

  // --- Wave 1: top-level comments (all independent) ---
  const topLevel = tasks.slice(0, 4);
  await Promise.all(
    topLevel.map(async (task, i) => {
      const body = await generateSingleComment(subreddit, task.persona, thread, "", null, task.instruction);
      if (body) results[i] = { persona: task.persona, body, parentIndex: null };
    })
  );

  // --- Wave 2: replies (need wave 1 text, but can still run in parallel) ---
  const replies = tasks.slice(4);
  await Promise.all(
    replies.map(async (task, i) => {
      const globalIndex = i + 4;
      const existingText = results
        .slice(0, globalIndex)
        .filter(Boolean)
        .map((r, idx) => `[${idx}] ${r.persona.username}: "${r.body}"`)
        .join("\n");

      const parentComment = task.parentIndex !== null ? results[task.parentIndex] : null;

      const body = await generateSingleComment(
        subreddit,
        task.persona,
        thread,
        existingText,
        parentComment?.body ?? null,
        task.instruction
      );
      if (body) results[globalIndex] = { persona: task.persona, body, parentIndex: task.parentIndex };
    })
  );

  return results.filter(Boolean);
}

async function generateSingleComment(
  subreddit: Subreddit,
  persona: Persona,
  thread: { title: string; body: string },
  existingCommentsText: string,
  parentComment: string | null,
  instruction: string
): Promise<string | null> {
  try {
    const response = await robustGenerate(
      buildCommentPrompt(subreddit, persona, thread.title, thread.body, existingCommentsText, parentComment, instruction),
      { tier: "normal", config: { temperature: 0.9 }, fallbackContent: FALLBACK_COMMENT }
    );
    const parsed = extractJSON<{ body: string }>(response);
    return parsed?.body ?? null;
  } catch (err) {
    console.error(`[comment-gen] Failed for ${persona.username}:`, err);
    return null;
  }
}