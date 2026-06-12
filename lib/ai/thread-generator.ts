import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { buildThreadPrompt } from "@/lib/ai/prompts";
import type { Persona, Community, GeneratedThread, ContentPayload } from "@/types";
import { describeGenerationFailure } from "@/lib/ai/provider-errors";

export async function generateThread(
  community: Community,
  persona: Persona,
  content: ContentPayload
): Promise<{
  thread: (GeneratedThread & { tokensUsed: number }) | null;
  error?: string;
  tokensUsed: number;
  rawResponse?: string;
}> {
  try {
    const prompt = buildThreadPrompt(community, persona, content);
    
    const result = await robustGenerate(prompt, {
      tier: "normal",
      role: 'generator',
      config: content.mode === "create"
        ? { temperature: 0.9, maxOutputTokens: 2400 }
        : { temperature: 0.7 },
    });

    if (!result?.text) {
      return {
        thread: null,
        error: describeGenerationFailure(result?.error, undefined),
        tokensUsed: result?.tokensUsed ?? 0,
      };
    }
    const thread = extractJSON<GeneratedThread>(result.text);
    if (!thread) {
      return {
        thread: null,
        error: describeGenerationFailure(result.error, result.text),
        tokensUsed: result.tokensUsed ?? 0,
        rawResponse: result.text,
      };
    }

    return {
      thread: { ...thread, tokensUsed: result.tokensUsed ?? 0 },
      tokensUsed: result.tokensUsed ?? 0,
    };
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return {
      thread: null,
      error: err instanceof Error ? err.message : String(err),
      tokensUsed: 0,
    };
  }
}
