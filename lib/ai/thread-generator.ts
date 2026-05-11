import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import { buildThreadPrompt } from "./prompts";
import type { Persona, Community, GeneratedThread, ContentPayload } from "@/types";

export async function generateThread(
  community: Community,
  persona: Persona,
  content: ContentPayload
): Promise<GeneratedThread | null> {
  try {
    const prompt = buildThreadPrompt(community, persona, content);
    
    const result = await robustGenerate(prompt, {
      tier: "normal",
      config: { temperature: 0.7 },
    });

    if (!result?.text) return null;
    return extractJSON<GeneratedThread>(result.text);
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return null;
  }
}
