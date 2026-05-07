import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch subreddits and persona count separately (Personas are now universal)
  const [
    { data: subreddits, error: subError },
    { count: totalPersonas, error: personaError }
  ] = await Promise.all([
    supabase.from("subreddits").select("*").order("name"),
    supabase.from("personas").select("*", { count: "exact", head: true })
  ]);

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (personaError) return NextResponse.json({ error: personaError.message }, { status: 500 });

  // Map the universal persona count into the structure the frontend expects: personas[0].count
  const data = subreddits?.map(sub => ({
    ...sub,
    personas: [{ count: totalPersonas ?? 0 }]
  })) ?? [];

  return NextResponse.json(data);
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
      .from("subreddits")
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
