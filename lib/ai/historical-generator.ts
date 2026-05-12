import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import type { Community, ContentPayload } from "@/types";
import { languageInstruction } from "./prompts";

export async function generateHistoricalTopic(
  community: Community,
  coveredHeadlines: string[]
): Promise<ContentPayload | null> {
  const prompt = `
You are a content curator for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}

Your task: surface a genuinely interesting historical fact, event, or figure
related to this community's focus. NOT a breaking news story — something 
timeless that sparks discussion.

${coveredHeadlines.length > 0
    ? `ALREADY COVERED:\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
    : ""}

Criteria:
- Underexplored angle, not the obvious textbook version
- Has a hook that makes people want to discuss it
- Grounded in fact, citable to real sources or well-known historical record
- Not already a cliché in this community

Return ONLY valid JSON:
{
  "headline": "the hook framing (e.g. 'The Roman emperor who tried to abolish money')",
  "summary": "2-3 sentences of factual background",
  "angle": "why this specific angle is interesting",
  "why_interesting": "one sentence on why this community would engage"
}
`;

  const result = await robustGenerate(prompt, {
    tier: "normal",
    purpose: 'generation',
    config: { temperature: 0.85 },
  });

  if (!result?.text) return null;
  const parsed = extractJSON<Omit<ContentPayload, "mode">>(result.text);
  if (!parsed) return null;
  return { ...parsed, mode: "historical" };
}
