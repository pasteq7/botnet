import { robustGenerate } from "./client";
import { extractJSON } from "./extract-json";
import { languageInstruction } from "./prompts";
import { sanitizeSourceUrl, buildFallbackUrl } from "./url-utils";
import type { Community, ContentPayload } from "@/types";

export async function generateWebSearchPost(
  community: Community,
  coveredHeadlines: string[]
): Promise<{ payload: ContentPayload | null; error?: string }> {
  try {
    const prompt = `
You are a content curator for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}

Use the search results provided to you to find the single most interesting, 
discussion-worthy page related to this community's topic. This does NOT have 
to be breaking news — it can be a Wikipedia article, a documentation page, a 
GitHub repo, a blog post, a forum thread, a research paper, a changelog, a 
product page, or any other web content that community members would find 
genuinely valuable.

The \"url\" in your JSON MUST be a URL from the search results — do NOT invent URLs.

${coveredHeadlines.length > 0
    ? `ALREADY COVERED (skip these):\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
    : ""}

Rules:
- Prefer primary sources over aggregators (go to the actual Wikipedia page,
  the actual GitHub repo, the actual docs — not a blog summarizing them)
- The page must actually exist and be publicly accessible
- Pick something surprising, underexplored, or newly relevant — not the
  most obvious result for this community
- Do NOT pick breaking news stories — use this mode for evergreen or
  slow-burn content. News belongs in 'news' mode.
- Avoid paywalled content

Return ONLY valid JSON, no markdown:
{
  "headline": "descriptive title framing why this page is interesting",
  "summary": "2-3 sentences explaining what the page is and why it matters to this community",
  "url": "direct URL to the page",
  "angle": "the specific hook that makes this worth posting",
  "why_interesting": "one sentence on why this community would engage"
}
`;

    const result = await robustGenerate(prompt, {
      tier: "normal",
      searchEnabled: true,
      maxRetries: 3,
      config: { temperature: 0.5 },
    });

    if (!result?.text) return { payload: null, error: "Empty AI response" };

    if (!result.groundingChunks?.length) {
      console.warn(
        `[web-search-generator] No grounding chunks for ${community.slug} — model likely hallucinated. Discarding.`
      );
      return { payload: null, error: "No grounding chunks returned (model hallucinated)" };
    }

    const parsed = extractJSON<Omit<ContentPayload, "mode">>(result.text);
    if (!parsed?.headline) return { payload: null, error: "No headline in extracted payload" };

    const fallbackUrl = sanitizeSourceUrl(parsed.url ?? null) ?? buildFallbackUrl(parsed.headline);
    let url: string = fallbackUrl;
    for (const chunk of result.groundingChunks) {
      const groundedUrl = chunk.web?.uri;
      if (groundedUrl) {
        const cleanUrl = sanitizeSourceUrl(groundedUrl);
        if (cleanUrl) {
          url = cleanUrl;
          break;
        }
      }
    }

    return {
      payload: { ...parsed, url, mode: "web-search" },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[web-search-generator] Failed for ${community.slug}:`, err);
    return { payload: null, error: msg };
  }
}
