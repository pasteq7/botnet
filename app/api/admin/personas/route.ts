import { NextRequest, NextResponse } from "next/server";
import { adminUnauthorized, requireAdmin } from "@/lib/auth/admin";

const PERSONA_UPDATE_FIELDS = [
  "username",
  "personality_prompt",
  "writing_style",
  "avatar_seed",
  "scope",
] as const;

function pickAllowedFields(
  source: Record<string, unknown>,
  fields: readonly string[]
): Record<string, unknown> {
  const allowed = new Set(fields);
  const rejected = Object.keys(source).filter(
    (key) => key !== "persona_communities" && !allowed.has(key)
  );
  if (rejected.length > 0) {
    throw new Error(`Unsupported fields: ${rejected.join(", ")}`);
  }

  return Object.fromEntries(
    Object.entries(source).filter(
      ([key, value]) => key !== "persona_communities" && value !== undefined
    )
  );
}

export async function GET() {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  const { data, error } = await supabase
    .from("personas")
    .select("*, persona_communities(community_id, communities(name, slug))")
    .order("username");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.username || !body.personality_prompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("personas")
      .insert({
        username: body.username,
        personality_prompt: body.personality_prompt,
        writing_style: body.writing_style || "casual",
        avatar_seed: body.avatar_seed || body.username.toLowerCase(),
        scope: body.scope || "global",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if ((body.scope === 'scoped' || body.scope === 'excluded') && body.community_ids?.length) {
      const { error: pcErr } = await supabase.from("persona_communities").insert(
        body.community_ids.map((cid: string) => ({ persona_id: data.id, community_id: cid }))
      );
      if (pcErr) console.error("Failed to link persona communities:", pcErr.message);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  try {
    const { id, community_ids, ...updates } = await req.json();
    
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    if (
      community_ids !== undefined &&
      (!Array.isArray(community_ids) || community_ids.some((cid) => typeof cid !== "string"))
    ) {
      return NextResponse.json({ error: "community_ids must be an array of IDs" }, { status: 400 });
    }

    const safeUpdates = pickAllowedFields(updates, PERSONA_UPDATE_FIELDS);

    const { data, error } = await supabase
      .from("personas")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (community_ids !== undefined) {
      await supabase.from("persona_communities").delete().eq("persona_id", id);
      if (community_ids.length > 0) {
        const { error: pcErr } = await supabase.from("persona_communities").insert(
          community_ids.map((cid: string) => ({ persona_id: id, community_id: cid }))
        );
        if (pcErr) console.error("Failed to link persona communities:", pcErr.message);
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminUnauthorized();
  const { supabase } = adminAuth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  // 1. Nullify references in threads and comments
  const { error: threadErr } = await supabase.from("threads").update({ persona_id: null }).eq("persona_id", id);
  if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 500 });

  const { error: commentErr } = await supabase.from("comments").update({ persona_id: null }).eq("persona_id", id);
  if (commentErr) return NextResponse.json({ error: commentErr.message }, { status: 500 });

  // 2. Delete the persona
  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
