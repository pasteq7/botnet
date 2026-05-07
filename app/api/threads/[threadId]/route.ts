import { NextRequest, NextResponse } from "next/server";
import { getThreadWithComments } from "@/lib/supabase/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const data = await getThreadWithComments(threadId);
  if (!data.thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
