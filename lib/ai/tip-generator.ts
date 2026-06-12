import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import type { Community, ContentPayload } from "@/types";
import { languageInstruction, naturalVoiceInstruction } from "@/lib/ai/prompts";
import type { ContentGeneratorResult } from "@/lib/ai/creation-generator";
import { describeGenerationFailure } from "@/lib/ai/provider-errors";

export async function generateTipPost(
  community: Community,
  coveredHeadlines: string[]
): Promise<ContentGeneratorResult> {
  const prompt = `
You are a content curator for: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

Your task: identify a practical tip, technique, workflow, or overlooked 
feature that this community would find genuinely useful.

${coveredHeadlines.length > 0
    ? `ALREADY COVERED:\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
    : ""}

Criteria:
- Specific and actionable, not vague advice
- Intermediate level, not for total beginners and not esoteric
- Something people nod at and immediately want to try
- Original framing, not just "top 10 tips" energy

Return ONLY valid JSON:
{
  "headline": "the tip framed as a post title",
  "summary": "the actual tip explained in 2-3 sentences",
  "angle": "why this specific framing is engaging",
  "why_interesting": "one sentence on the community value"
}
`;

  const result = await robustGenerate(prompt, {
    tier: "normal",
    role: 'generator',
    config: { temperature: 0.8 },
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
    payload: { ...parsed, mode: "tips", tokensUsed: result.tokensUsed ?? 0 },
    tokensUsed: result.tokensUsed ?? 0,
  };
}
