import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { huntNews } from "@/lib/ai/news-hunter";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { GENERATIVE_MODEL } from "@/lib/ai/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("id");

  const supabase = getSupabase();
  let query = supabase
    .from("subreddits")
    .select("*")
    .eq("is_active", true);

  if (targetId) {
    query = query.eq("id", targetId);
  }

  const { data: subreddits } = await query;

  if (!subreddits?.length) {
    return NextResponse.json({ message: "No active subreddits" });
  }

  const results = [];

  for (const subreddit of subreddits) {
    console.log(`[cron] Processing subreddit: ${subreddit.slug}...`);
    try {
      // Fetch recent headlines for local dedup
      const { data: recentThreads } = await supabase
        .from("threads")
        .select("source_url, source_headline")
        .eq("subreddit_id", subreddit.id)
        .order("published_at", { ascending: false })
        .limit(10);

      const localHeadlines = (recentThreads ?? [])
        .map((t) => t.source_headline)
        .filter((h): h is string => !!h);

      // Fetch all source URLs from last 24h globally for cross-subreddit dedup
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: globalThreads } = await supabase
        .from("threads")
        .select("source_url")
        .gte("published_at", twentyFourHoursAgo);

      const globalUrls = new Set(
        (globalThreads ?? [])
          .map((t) => t.source_url)
          .filter((u): u is string => !!u)
      );

      console.log(`[cron] Hunting news for ${subreddit.slug}...`);
      const story = await huntNews(subreddit, localHeadlines);
      if (!story) {
        results.push({ subreddit: subreddit.slug, status: "skipped_no_news" });
        continue;
      }

      // Skip if this URL was already posted globally in the last 24h
      if (globalUrls.has(story.url)) {
        console.log(`[cron] Skipping duplicate URL for ${subreddit.slug}: ${story.url}`);
        results.push({ subreddit: subreddit.slug, status: "skipped_duplicate_url" });
        continue;
      }

      const { data: personas } = await supabase
        .from("personas")
        .select("*")
        .eq("subreddit_id", subreddit.id);

      if (!personas?.length) {
        results.push({ subreddit: subreddit.slug, status: "skipped_no_personas" });
        continue;
      }

      const opPersona = personas[Math.floor(Math.random() * personas.length)];
      console.log(`[cron] Generating thread for ${subreddit.slug} using persona ${opPersona.username}...`);

      const threadContent = await generateThread(subreddit, opPersona, story);
      if (!threadContent) {
        results.push({ subreddit: subreddit.slug, status: "failed_thread" });
        continue;
      }

      const { data: thread } = await supabase
        .from("threads")
        .insert({
          subreddit_id: subreddit.id,
          persona_id: opPersona.id,
          title: threadContent.title,
          body: threadContent.body,
          flair: threadContent.flair,
          source_url: story.url,
          source_headline: story.headline,
          simulated_upvotes: Math.floor(Math.random() * 2000) + 100,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!thread) continue;

      console.log(`[cron] Generating comment chain for thread: ${threadContent.title}...`);
      const commentChain = await generateCommentChain(
        subreddit,
        personas,
        { title: threadContent.title, body: threadContent.body },
        opPersona.id
      );

      const insertedCommentIds: string[] = [];
      for (const comment of commentChain) {
        const parentId =
          comment.parentIndex !== null
            ? insertedCommentIds[comment.parentIndex]
            : null;

        const { data: inserted } = await supabase
          .from("comments")
          .insert({
            thread_id: thread.id,
            parent_comment_id: parentId ?? null,
            persona_id: comment.persona.id,
            body: comment.body,
            depth: parentId ? 1 : 0,
            simulated_upvotes: Math.floor(Math.random() * 500) + 10,
          })
          .select("id")
          .single();

        insertedCommentIds.push(inserted?.id ?? "");
      }

      await supabase
        .from("threads")
        .update({ simulated_comments_count: commentChain.length })
        .eq("id", thread.id);

      console.log(`[cron] Revalidating paths for ${subreddit.slug}...`);
      revalidatePath(`/r/${subreddit.slug}`);
      revalidatePath(`/r/${subreddit.slug}/${thread.id}`);
      revalidatePath("/");

      results.push({ subreddit: subreddit.slug, status: "success", threadId: thread.id });
    } catch (err) {
      console.error(`[cron] Error for ${subreddit.slug}:`, err);
      results.push({ subreddit: subreddit.slug, status: "error" });
    }
  }

  return NextResponse.json({ results });
}
