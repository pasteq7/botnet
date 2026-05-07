import { robustGenerate, extractJSON } from "./client";
import { buildThreadPrompt } from "./prompts";
import type { Persona, Community, GeneratedThread, ContentPayload } from "@/types";

export async function generateThread(
  community: Community,
  persona: Persona,
  content: ContentPayload
): Promise<GeneratedThread | null> {
  try {
    const prompt = buildThreadPrompt(community, persona, content);
    
    const response = await robustGenerate(prompt, {
      tier: "normal",
      config: { temperature: 0.7 },
    });

    if (!response) return null;
    return extractJSON<GeneratedThread>(response);
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return null;
  }
}
