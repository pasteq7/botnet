import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminUnauthorized, requireAdmin } from "@/lib/auth/admin";
import { DEFAULT_POSTING_INTERVAL_MINUTES, MAX_COMMENTS_PER_THREAD } from "@/lib/constants";
import {
  getCommunitySlugError,
  getCommunityTextLimitError,
  normalizeCommunitySlug,
} from "@/lib/community-fields";

const COMMUNITY_UPDATE_FIELDS = [
  "slug",
  "name",
  "description",
  "icon_name",
  "topic_prompt",
  "tone_guidelines",
  "is_active",
  "content_modes",
  "content_mode_weights",
  "language",
  "language_strict",
  "generation_interval_minutes",
  "min_comments_per_thread",
  "max_comments_per_thread",
  "search_scope",
] as const;

function pickAllowedFields(
  source: Record<string, unknown>,
  fields: readonly string[]
): Record<string, unknown> {
  const allowed = new Set(fields);
  const rejected = Object.keys(source).filter((key) => !allowed.has(key));
  if (rejected.length > 0) {
    throw new Error(`Unsupported fields: ${rejected.join(", ")}`);
  }

  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined)
  );
}

function parseOptionalCommentCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return Math.min(Math.max(Number.parseInt(String(value), 10) || 0, 0), MAX_COMMENTS_PER_THREAD);
}

function normalizeCommentRange<T extends Record<string, unknown>>(data: T): T {
  if (!("min_comments_per_thread" in data) && !("max_comments_per_thread" in data)) {
    return data;
  }

  const min = parseOptionalCommentCount(data.min_comments_per_thread);
  const max = parseOptionalCommentCount(data.max_comments_per_thread);
  return {
    ...data,
    min_comments_per_thread: min,
    max_comments_per_thread: min !== null && max !== null && max < min ? min : max,
  };
}

function validateCommunityTextFields(data: Record<string, unknown>) {
  const limitError = getCommunityTextLimitError(data);
  if (limitError) throw new Error(limitError);
}

function normalizeAndValidateSlug(data: Record<string, unknown>) {
  if (!("slug" in data)) return;
  const rawSlug = typeof data.slug === "string" ? data.slug : "";
  const slug = normalizeCommunitySlug(rawSlug);
  const slugError = getCommunitySlugError(slug);
  if (slugError) throw new Error(slugError);
  data.slug = slug;
}

export async function GET() {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  // Fetch communities and persona count separately (Personas are now universal)
  const [
    { data: communities, error: subError },
    { count: totalPersonas, error: personaError }
  ] = await Promise.all([
    supabase.from("communities").select("*").order("name"),
    supabase.from("personas").select("*", { count: "exact", head: true })
  ]);

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (personaError) return NextResponse.json({ error: personaError.message }, { status: 500 });

  // Map the universal persona count into the structure the frontend expects: personas[0].count
  const data = communities?.map(sub => ({
    ...sub,
    personas: [{ count: totalPersonas ?? 0 }]
  })) ?? [];

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  try {
    const body = await req.json();

    // Basic validation
    if (!body.slug || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const insertData = normalizeCommentRange({
      slug: body.slug,
      name: body.name,
      description: body.description || null,
      icon_name: body.icon_name || "Hash",
      topic_prompt: body.topic_prompt || "",
      tone_guidelines: body.tone_guidelines || "",
      is_active: body.is_active ?? true,
      content_modes: body.content_modes || ['news'],
      content_mode_weights: body.content_mode_weights || { news: 1.0 },
      language: body.language || 'english',
      language_strict: body.language_strict ?? false,
      generation_interval_minutes: body.generation_interval_minutes ?? DEFAULT_POSTING_INTERVAL_MINUTES,
      min_comments_per_thread: body.min_comments_per_thread ?? null,
      max_comments_per_thread: body.max_comments_per_thread ?? null,
      search_scope: body.search_scope || null
    });
    validateCommunityTextFields(insertData);
    normalizeAndValidateSlug(insertData);

    const { data, error } = await supabase
      .from("communities")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      const message = error.code === "23505" ? "That community slug is already in use" : error.message;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing community ID" }, { status: 400 });

  const { error } = await supabase.from("communities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  try {
    const { id, ...updates } = await req.json();

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const safeUpdates = normalizeCommentRange(
      pickAllowedFields(updates, COMMUNITY_UPDATE_FIELDS)
    );
    validateCommunityTextFields(safeUpdates);
    normalizeAndValidateSlug(safeUpdates);

    const { data: existingCommunity } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("communities")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      const message = error.code === "23505" ? "That community slug is already in use" : error.message;
      return NextResponse.json({ error: message }, { status });
    }

    if (existingCommunity?.slug && existingCommunity.slug !== data.slug) {
      revalidatePath(`/c/${existingCommunity.slug}`);
      revalidatePath(`/c/${data.slug}`);
      revalidatePath("/sitemap.xml");
    }
    revalidatePath("/");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON" },
      { status: 400 }
    );
  }
}
