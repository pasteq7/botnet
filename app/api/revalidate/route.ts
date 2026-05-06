import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slug = searchParams.get("slug");
  const threadId = searchParams.get("threadId");
  if (slug) revalidatePath(`/r/${slug}`);
  if (threadId && slug) revalidatePath(`/r/${slug}/${threadId}`);
  revalidatePath("/");
  return NextResponse.json({ revalidated: true });
}
