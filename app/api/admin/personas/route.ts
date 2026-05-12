import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("personas")
    .select("*, persona_communities(community_id, communities(name, slug))")
    .order("username");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        archetype: body.archetype || "neutral",
        writing_style: body.writing_style || "casual",
        avatar_seed: body.avatar_seed || body.username.toLowerCase(),
        scope: body.scope || "global",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.scope === 'scoped' && body.community_ids?.length) {
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
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, community_ids, ...updates } = await req.json();
    
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    delete updates.persona_communities;

    const { data, error } = await supabase
      .from("personas")
      .update(updates)
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
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
