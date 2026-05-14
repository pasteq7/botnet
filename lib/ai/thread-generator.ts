import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import { buildThreadPrompt } from "./prompts";
import type { Persona, Community, GeneratedThread, ContentPayload } from "@/types";

export async function generateThread(
  community: Community,
  persona: Persona,
  content: ContentPayload
): Promise<(GeneratedThread & { tokensUsed: number }) | null> {
  try {
    const prompt = buildThreadPrompt(community, persona, content);
    
    const result = await robustGenerate(prompt, {
      tier: "normal",
      role: 'generator',
      config: { temperature: 0.7 },
    });

    if (!result?.text) return null;
    const thread = extractJSON<GeneratedThread>(result.text);
    if (!thread) return null;

    return { ...thread, tokensUsed: result.tokensUsed ?? 0 };
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return null;
  }
}
