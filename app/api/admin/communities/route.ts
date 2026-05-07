import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.slug || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("communities")
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description || null,
        icon_emoji: body.icon_emoji || "🏘️",
        topic_prompt: body.topic_prompt || "",
        tone_guidelines: body.tone_guidelines || "",
        refresh_interval_hours: body.refresh_interval_hours || 4,
        is_active: body.is_active ?? true,
        content_modes: body.content_modes || ['news'],
        content_mode_weights: body.content_mode_weights || { news: 1.0 },
        language: body.language || 'en',
        language_strict: body.language_strict ?? false
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, ...updates } = await req.json();
    
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data, error } = await supabase
      .from("communities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
