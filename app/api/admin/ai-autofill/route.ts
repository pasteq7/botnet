import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { robustGenerate } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";

const PERSONA_PROMPT = (prompt: string) => `You are an AI assistant that designs personas for an AI-generated community platform.

Based on the following simple description, generate a complete persona with ALL fields filled in.

User description: "${prompt}"

Generate a JSON object with these EXACT fields:
- "username": A creative, unique username (camel case, no spaces, e.g. "CuriousMarie")
- "personality_prompt": A 2-4 sentence detailed personality description covering what they care about, how they think, their blind spots, and what makes them unique
- "writing_style": A short description of their writing style (e.g. "terse and dry, lots of em-dashes, dry wit")
- "archetype": One of: "neutral", "skeptic", "enthusiast", "storyteller", "expert", "provocateur", "optimist"
- "avatar_seed": A short string for avatar generation derived from the persona's theme
- "scope": "global"

Rules:
- The username MUST be unique and creative — combine a trait with a name or concept
- The personality_prompt must be detailed enough for an LLM to accurately roleplay this persona
- Match the archetype to the described personality
- avatar_seed should be lowercase, no spaces, derived from the persona's theme

Return ONLY valid JSON, no markdown, no explanation:
{
  "username": "string",
  "personality_prompt": "string",
  "writing_style": "string",
  "archetype": "string",
  "avatar_seed": "string",
  "scope": "global"
}`;

const COMMUNITY_PROMPT = (prompt: string) => `You are an AI assistant that designs communities for an AI-generated community platform.

Based on the following simple description, generate a complete community with ALL fields filled in.

User description: "${prompt}"

Generate a JSON object with these EXACT fields:
- "name": A short, catchy community name (1-3 words)
- "slug": URL-friendly version of name (lowercase, dashes, e.g. "retro-gaming")
- "description": A 1-2 sentence summary of the community
- "topic_prompt": A detailed paragraph describing topics, niches, keywords, and themes the AI agent should target for content generation
- "tone_guidelines": A detailed paragraph defining the voice, formality, and editorial stance for generated posts
- "icon_name": A Lucide icon name (one of: "Hash", "Gamepad2", "Music2", "BookOpen", "FlaskConical", "Palette", "Globe", "Cpu", "Brain", "Heart", "Zap", "Star", "Sun", "Moon", "Rocket", "MessageCircle", "Newspaper", "Lightbulb", "HelpCircle", "Bot", "Users", "Sparkles", "Telescope", "Microscope", "Landmark")
- "language": The primary language (e.g. "english", "french", "spanish")
- "language_strict": boolean - whether to enforce strict language adherence
- "generation_interval_minutes": 240 (default)
- "search_scope": null (default)

Rules:
- Name should be memorable and descriptive
- Slug must match the pattern: lowercase letters, numbers, and dashes only
- topic_prompt should be 3-6 sentences with concrete topics
- tone_guidelines should be 3-6 sentences defining community culture and voice
- Pick an icon_name that best represents the community theme

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "topic_prompt": "string",
  "tone_guidelines": "string",
  "icon_name": "string",
  "language": "string",
  "language_strict": false,
  "generation_interval_minutes": 240,
  "search_scope": null
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, prompt } = body;

    if (!type || !prompt) {
      return NextResponse.json({ error: "Missing type or prompt" }, { status: 400 });
    }

    if (type !== "persona" && type !== "community") {
      return NextResponse.json({ error: "type must be 'persona' or 'community'" }, { status: 400 });
    }

    const systemPrompt = type === "persona" ? PERSONA_PROMPT(prompt) : COMMUNITY_PROMPT(prompt);

    const result = await robustGenerate(systemPrompt, { role: "generator", tier: "fast" });

    if (!result || !result.text) {
      return NextResponse.json({ error: result?.error || "AI generation failed" }, { status: 500 });
    }

    const parsed = extractJSON<Record<string, unknown>>(result.text);

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI response as JSON" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
