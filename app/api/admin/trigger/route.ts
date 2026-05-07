import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subredditId } = await req.json();
    if (!subredditId) return NextResponse.json({ error: "Missing Subreddit ID" }, { status: 400 });

    await inngest.send({
      name: "botnet/subreddit.generate",
      data: { subredditId, subredditSlug: "" },
    });

    return NextResponse.json({ status: "triggered", subredditId });
  } catch (err) {
    const error = err as Error;
    console.error("[trigger] Error:", error);
    return NextResponse.json({ error: `Failed to trigger: ${error.message}` }, { status: 500 });
  }
}
