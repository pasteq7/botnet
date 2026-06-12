import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { buildBatchCommentPrompt } from "@/lib/ai/prompts";
import type { Community, Persona, RecentCommunityCoverage } from "@/types";

const COMMENT_ROLES = [
  { role: "skeptic", instruction: "Question one specific claim with a concrete reason, not the whole premise." },
  { role: "contextualizer", instruction: "Add recent or situational context that changes how this update should be read. Avoid basic explainer facts." },
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
  commentCount?: number,
  recentCoverage?: RecentCommunityCoverage[]
): Promise<{
  chain: Array<{ persona: Persona; body: string; parentIndex: number | null }>;
  tokensUsed: number;
  isFiltered?: boolean;
  error?: string;
}> {

  const pool = personas
    .filter((p) => p.id !== opPersonaId)
    .sort(() => Math.random() - 0.5);

  const targetCount = commentCount ?? (Math.floor(Math.random() * 5) + 4); // 4 to 8
  const count = Math.min(targetCount, pool.length);
  if (count <= 0) {
    return { chain: [], tokensUsed: 0 };
  }

  // Dynamic split: roughly 40-60% top level, the rest are replies
  const topLevelCount = Math.max(1, Math.floor(count * (0.4 + Math.random() * 0.2)));

  // Pre-assign roles and parent indices before any AI call (pre-calculate conversation tree)
  const tasks = Array.from({ length: count }, (_, i) => ({
    persona: pool[i],
    instruction: COMMENT_ROLES[i % COMMENT_ROLES.length].instruction,
    parentIndex: i >= topLevelCount ? Math.floor(Math.random() * i) : null,
  }));

  // Single batched AI call for all comments
  const prompt = buildBatchCommentPrompt(community, thread, tasks, topLevelCount, recentCoverage);

  const result = await robustGenerate(prompt, {
    tier: "normal",
    role: 'generator',
    config: { temperature: 0.9 },
    fallbackContent: "[]",
    maxRetries: 2,
  });

  const raw = extractJSON<Array<{ personaIndex: number; body: string }>>(result?.text ?? null);
  if (!raw || raw.length === 0) {
    console.warn("[comment-generator] Empty or unparseable response", {
      responseLength: result?.text?.length,
      preview: result?.text?.slice(0, 200),
    });
  }
  const parsed = raw ?? [];
  let isFiltered = false;

  if (parsed.length === 0) {
    const output = (result?.text ?? "").toLowerCase();
    const error = (result?.error ?? "").toLowerCase();
    const safetyKeywords = ["safety", "filter", "policy", "sensitive", "refuse", "prohibited", "blocked"];
    const isSafetyError = safetyKeywords.some(kw => output.includes(kw) || error.includes(kw));

    // If we got an empty response or a safety-related refusal
    if (isSafetyError || (result?.text?.length ?? 0) === 0) {
      isFiltered = true;
    }
  }

  const results: Array<{ persona: Persona; body: string; parentIndex: number | null }> = [];

  for (const entry of parsed) {
    if (
      typeof entry.personaIndex !== "number" ||
      entry.personaIndex < 0 ||
      entry.personaIndex >= tasks.length
    ) {
      console.warn("[comment-generator] Invalid personaIndex", entry);
      continue;
    }
    const task = tasks[entry.personaIndex];
    if (task && entry.body?.trim()) {
      results[entry.personaIndex] = {
        persona: task.persona,
        body: entry.body,
        parentIndex: task.parentIndex,
      };
    }
  }

  // Build mapping from original task index to position in filtered chain
  const originalToFiltered = new Map<number, number>();
  let filteredIdx = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i] !== undefined) {
      originalToFiltered.set(i, filteredIdx++);
    }
  }

  const commentChain = results.filter(Boolean);

  // Remap parentIndex so it refers to filtered chain positions, not original task indices
  const chain = commentChain.map((comment) => {
    if (comment.parentIndex === null) return comment;
    const remapped = originalToFiltered.get(comment.parentIndex);
    return {
      ...comment,
      parentIndex: remapped !== undefined ? remapped : null,
    };
  });

  return {
    chain,
    tokensUsed: result?.tokensUsed ?? 0,
    isFiltered,
    error: result?.error,
  };
}
