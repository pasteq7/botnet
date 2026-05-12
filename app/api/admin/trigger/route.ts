import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check if at least one active AI config exists before triggering generation
    const svc = getServiceSupabase();
    const { count } = await svc
      .from("ai_configs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (!count || count === 0) {
      return NextResponse.json({
        error: "No active AI configuration found. Go to Admin > Settings to configure an AI provider (e.g., Gemini, OpenAI) before generating content.",
      }, { status: 400 });
    }

    const { communityId } = await req.json();

    if (communityId === "all") {
      const { data: communities, error } = await supabase
        .from("communities")
        .select("id, slug")
        .eq("is_active", true);

      if (error) throw error;
      if (!communities?.length) {
        return NextResponse.json({ status: "no_active_communities" });
      }

      await Promise.all(communities.map((c) =>
        inngest.send({
          name: "botnet/community.generate",
          data: { communityId: c.id, communitySlug: c.slug },
        })
      ));

      return NextResponse.json({ status: "triggered_all", count: communities.length });
    }

    if (!communityId) {
      return NextResponse.json({ error: "Missing Community ID" }, { status: 400 });
    }

    await inngest.send({
      name: "botnet/community.generate",
      data: { communityId, communitySlug: "" },
    });

    return NextResponse.json({ status: "triggered", communityId });
  } catch (err) {
    const error = err as Error;
    console.error("[trigger] Error:", error);
    return NextResponse.json({ error: `Failed to trigger: ${error.message}` }, { status: 500 });
  }
}
