import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import type { Community, ContentPayload, ContentMode } from "@/types";
import { languageInstruction, naturalVoiceInstruction } from "@/lib/ai/prompts";
import type { ContentGeneratorResult } from "@/lib/ai/creation-generator";
import { describeGenerationFailure } from "@/lib/ai/provider-errors";

export async function generateDiscussionPrompt(
  community: Community,
  coveredHeadlines: string[],
  mode: ContentMode = "discussion"
): Promise<ContentGeneratorResult> {
  const modeLabel = mode === "ask" ? "question (community Q&A style)" :
    "discussion prompt";

  const prompt = `
You are a content curator for: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

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
    role: 'generator',
    config: { temperature: 0.9 }, // Higher temperature for more creative discussion prompts
  });

  if (!result?.text) {
    return {
      payload: null,
      error: describeGenerationFailure(result?.error, undefined),
      tokensUsed: result?.tokensUsed ?? 0,
    };
  }
  const parsed = extractJSON<Omit<ContentPayload, "mode">>(result.text);
  if (!parsed) {
    return {
      payload: null,
      error: describeGenerationFailure(result.error, result.text),
      tokensUsed: result.tokensUsed ?? 0,
      rawResponse: result.text,
    };
  }
  return {
    payload: { ...parsed, mode, tokensUsed: result.tokensUsed ?? 0 },
    tokensUsed: result.tokensUsed ?? 0,
  };
}
