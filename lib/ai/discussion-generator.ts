import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import type { Community, ContentPayload, ContentMode } from "@/types";
import { languageInstruction } from "./prompts";

export async function generateDiscussionPrompt(
  community: Community,
  coveredHeadlines: string[],
  mode: ContentMode = "discussion"
): Promise<(ContentPayload & { tokensUsed: number }) | null> {
  const modeLabel = mode === "ask" ? "question (community Q&A style)" :
    "discussion prompt";

  const prompt = `
You are a content curator for: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}

Your task: generate a ${modeLabel} that sparks high engagement and varied opinions.

${coveredHeadlines.length > 0
      ? `ALREADY COVERED:\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
      : ""}

Criteria:
- Open-ended, not a yes/no question
- Relevant to the community's core interests
- Something people will have personal experiences or strong opinions about
- Not a repetitive or low-effort topic

Return ONLY valid JSON:
{
  "headline": "the discussion title",
  "summary": "1-2 sentences of context or framing for the discussion",
  "angle": "why this specific prompt is engaging right now",
  "why_interesting": "one sentence on the expected community reaction"
}
`;

  const result = await robustGenerate(prompt, {
    tier: "normal",
    purpose: 'generation',
    config: { temperature: 0.9 }, // Higher temperature for more creative discussion prompts
  });

  if (!result?.text) return null;
  const parsed = extractJSON<Omit<ContentPayload, "mode">>(result.text);
  if (!parsed) return null;
  return { ...parsed, mode, tokensUsed: result.tokensUsed ?? 0 };
}
