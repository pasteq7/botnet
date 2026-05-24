import { NextRequest, NextResponse } from "next/server";
import { getAllThreads, getThreadsByCommunity } from "@/lib/supabase/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const slug = searchParams.get("slug");
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 50)
    : 20;

  const threads = slug
    ? await getThreadsByCommunity(slug, limit + 1, cursor)
    : await getAllThreads(limit + 1, cursor);

  const hasMore = threads.length > limit;
  if (hasMore) threads.pop();

  return NextResponse.json({ threads, hasMore });
}
