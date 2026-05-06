import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subredditId } = await req.json();
    if (!subredditId) return NextResponse.json({ error: "Missing Subreddit ID" }, { status: 400 });

    const baseUrl = req.nextUrl.origin;
    const cronUrl = new URL("/api/cron/generate", baseUrl);
    cronUrl.searchParams.set("id", subredditId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10m timeout

    try {
      // Call the cron route internally
      const response = await fetch(cronUrl.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error: `Cron failed: ${error}` }, { status: response.status });
      }

      const result = await response.json();
      return NextResponse.json(result);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    const error = err as Error;
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "Generation timed out (10 minute limit exceeded)" }, { status: 504 });
    }
    console.error("[trigger] Error:", error);
    return NextResponse.json({ error: `Failed to trigger: ${error.message}` }, { status: 500 });
  }
}
