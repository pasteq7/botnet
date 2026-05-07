import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { communityId } = await req.json();
    if (!communityId) return NextResponse.json({ error: "Missing Community ID" }, { status: 400 });

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
