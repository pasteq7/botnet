import { robustGenerate, extractJSON } from "./client";
import { buildBatchCommentPrompt } from "./prompts";
import type { Community, Persona } from "@/types";

const COMMENT_ROLES = [
  { role: "skeptic", instruction: "Question one specific claim with a concrete reason — not the whole premise." },
  { role: "contextualizer", instruction: "Add relevant context or background that makes the story easier to understand." },
  { role: "supporter", instruction: "Support the OP with a specific reason or data point, not just agreement." },
  { role: "elaborator", instruction: "Add a relevant detail or angle the OP missed." },
  { role: "questioner", instruction: "Ask a genuine, specific question about the post." },
  { role: "experiencer", instruction: "Relate a specific factual parallel or real-world implication." },
  { role: "contrarian", instruction: "Disagree respectfully with one specific point, with a reason." },
  { role: "optimist", instruction: "Identify a concrete positive implication or underreported upside of this story." },
];

export async function generateCommentChain(
  community: Community,
  personas: Persona[],
  thread: { title: string; body: string },
  opPersonaId: string,
  commentCount?: number
): Promise<Array<{ persona: Persona; body: string; parentIndex: number | null }>> {

  const pool = personas
    .filter((p) => p.id !== opPersonaId)
    .sort(() => Math.random() - 0.5);

  const targetCount = commentCount ?? (Math.floor(Math.random() * 5) + 4); // 4 to 8
  const count = Math.min(targetCount, pool.length);

  // Dynamic split: roughly 40-60% top level, the rest are replies
  const topLevelCount = Math.max(1, Math.floor(count * (0.4 + Math.random() * 0.2)));

  // Pre-assign roles and parent indices before any AI call (pre-calculate conversation tree)
  const tasks = Array.from({ length: count }, (_, i) => ({
    persona: pool[i],
    instruction: COMMENT_ROLES[i % COMMENT_ROLES.length].instruction,
    parentIndex: i >= topLevelCount ? Math.floor(Math.random() * i) : null,
  }));

  // Single batched AI call for all comments
  const prompt = buildBatchCommentPrompt(community, thread, tasks, topLevelCount);

  const response = await robustGenerate(prompt, {
    tier: "normal",
    config: { temperature: 0.9 },
    fallbackContent: "[]",
    maxRetries: 0,
  });

  const parsed = extractJSON<Array<{ personaIndex: number; body: string }>>(response) ?? [];

  const results: Array<{ persona: Persona; body: string; parentIndex: number | null }> = [];

  for (const entry of parsed) {
    const task = tasks[entry.personaIndex];
    if (task && entry.body?.trim()) {
      results[entry.personaIndex] = {
        persona: task.persona,
        body: entry.body,
        parentIndex: task.parentIndex,
      };
    }
  }

  return results.filter(Boolean);
}