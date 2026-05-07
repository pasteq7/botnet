import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
