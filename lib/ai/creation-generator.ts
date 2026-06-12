import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { buildCreationBriefPrompt } from "@/lib/ai/prompts";
import type { Community, ContentPayload, RecentCommunityCoverage } from "@/types";
import { describeGenerationFailure } from "@/lib/ai/provider-errors";

export interface ContentGeneratorResult {
  payload: (ContentPayload & { tokensUsed: number }) | null;
  error?: string;
  tokensUsed: number;
  rawResponse?: string;
}

export async function generateCreationBrief(
  community: Community,
  recentCoverage: RecentCommunityCoverage[]
): Promise<ContentGeneratorResult> {
  const prompt = buildCreationBriefPrompt(community, recentCoverage);

  const result = await robustGenerate(prompt, {
    tier: "normal",
    role: "generator",
    config: { temperature: 0.95 },
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
    payload: {
      ...parsed,
      mode: "create",
      tokensUsed: result.tokensUsed ?? 0,
    },
    tokensUsed: result.tokensUsed ?? 0,
  };
}
