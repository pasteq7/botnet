import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Optional endpoint for external cache invalidation. Inngest generation already
// revalidates affected paths directly from the generation function.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slug = searchParams.get("slug");
  const threadId = searchParams.get("threadId");
  if (slug) revalidatePath(`/c/${slug}`);
  if (threadId && slug) revalidatePath(`/c/${slug}/${threadId}`);
  revalidatePath("/");
  return NextResponse.json({ revalidated: true });
}

export async function POST(req: NextRequest) {
  const { paths, secret } = await req.json();
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  for (const p of paths) {
    revalidatePath(p);
  }
  return NextResponse.json({ revalidated: true });
}
