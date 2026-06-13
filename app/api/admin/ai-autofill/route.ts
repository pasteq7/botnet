import { NextRequest, NextResponse } from "next/server";
import { adminUnauthorized, requireAdmin } from "@/lib/auth/admin";
import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import {
  AUTOFILL_VOICE_RULES,
  buildCommunityAutofillPrompt,
} from "@/lib/ai/autofill-prompts";
import {
  COMMUNITY_TEXT_MAX_LENGTH,
  truncateCommunityTextFields,
} from "@/lib/community-fields";

const PERSONA_PROMPT = (prompt: string) => `You design personas for an AI-generated community platform.

Based on the following simple description, generate a complete persona with ALL fields filled in.

User description: "${prompt}"
${AUTOFILL_VOICE_RULES}

Generate a JSON object with these EXACT fields:
- "username": A creative, unique username (camel case, no spaces, e.g. "CuriousMarie")
- "personality_prompt": A 2-4 sentence detailed personality description covering what they care about, how they think, their blind spots, and what makes them unique
- "writing_style": A short description of their writing style (e.g. "terse and dry, plain punctuation, dry wit")
- "avatar_seed": A short string for avatar generation derived from the persona's theme
- "scope": "global"

Rules:
- The username MUST be unique and creative, combining a trait with a name or concept
- The personality_prompt must be detailed enough for an LLM to accurately roleplay this persona
- avatar_seed should be lowercase, no spaces, derived from the persona's theme

Return ONLY valid JSON, no markdown, no explanation:
{
  "username": "string",
  "personality_prompt": "string",
  "writing_style": "string",
  "avatar_seed": "string",
  "scope": "global"
}`;

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();

  try {
    const body = await req.json();
    const { type, prompt } = body;

    if (!type || !prompt) {
      return NextResponse.json({ error: "Missing type or prompt" }, { status: 400 });
    }

    if (type !== "persona" && type !== "community") {
      return NextResponse.json({ error: "type must be 'persona' or 'community'" }, { status: 400 });
    }

    const systemPrompt = type === "persona"
      ? PERSONA_PROMPT(prompt)
      : buildCommunityAutofillPrompt(prompt, COMMUNITY_TEXT_MAX_LENGTH);

    const result = await robustGenerate(systemPrompt, { role: "generator", tier: "fast" });

    if (!result || !result.text) {
      return NextResponse.json({ error: result?.error || "AI generation failed" }, { status: 500 });
    }

    const parsed = extractJSON<Record<string, unknown>>(result.text);

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI response as JSON" }, { status: 500 });
    }

    return NextResponse.json(type === "community"
      ? {
          ...truncateCommunityTextFields(parsed),
          language_strict: true,
        }
      : parsed);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
