import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { inngest } from "./client";
import { huntNews } from "@/lib/ai/news-hunter";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { GENERATIVE_MODEL } from "@/lib/ai/client";
import type { Subreddit } from "@/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

async function logGeneration(
  supabase: SupabaseClient,
  params: {
    subreddit_id: string;
    status: "success" | "failed" | "skipped";
    model_used?: string;
    error_message?: string;
    thread_id?: string;
  }
) {
  await supabase.from("generation_logs").insert({
    subreddit_id: params.subreddit_id,
    status: params.status,
    model_used: params.model_used ?? GENERATIVE_MODEL,
    error_message: params.error_message ?? null,
    thread_id: params.thread_id ?? null,
  });
}

export const cronSubredditTrigger = inngest.createFunction(
  {
    id: "cron-subreddit-trigger",
    name: "Cron: Subreddit Trigger",
    triggers: [cron("0 */4 * * *")],
  },
  async ({ step }) => {
    const subreddits = await step.run("fetch-subreddits", async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("subreddits")
        .select("id, slug")
        .eq("is_active", true);
      return data ?? [];
    });

    if (subreddits.length === 0) {
      return { triggered: 0 };
    }

    await step.sendEvent(
      "fan-out-subreddits",
      subreddits.map((sub: { id: string; slug: string }) => ({
        name: "botnet/subreddit.generate" as const,
        data: { subredditId: sub.id, subredditSlug: sub.slug },
      }))
    );

    return { triggered: subreddits.length };
  }
);

export const generateSubredditContent = inngest.createFunction(
  {
    id: "generate-subreddit-content",
    name: "Generate Subreddit Content",
    triggers: [{ event: "botnet/subreddit.generate" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { subredditId } = event.data as { subredditId: string };
    let subreddit!: Subreddit;

    try {
      subreddit = await step.run("fetch-subreddit", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("subreddits")
          .select("*")
          .eq("id", subredditId)
          .single();
        if (!data) throw new Error(`Subreddit not found: ${subredditId}`);
        return data;
      });

      const dedupData = await step.run("fetch-dedup-data", async () => {
        const supabase = getSupabase();

        const { data: recentThreads } = await supabase
          .from("threads")
          .select("source_url, source_headline")
          .eq("subreddit_id", subreddit.id)
          .order("published_at", { ascending: false })
          .limit(10);

        const localHeadlines: string[] = (recentThreads ?? [])
          .map((t: { source_headline: string | null }) => t.source_headline)
          .filter((h: string | null): h is string => !!h);

        const twentyFourHoursAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();
        const { data: globalThreads } = await supabase
          .from("threads")
          .select("source_url")
          .gte("published_at", twentyFourHoursAgo);

        const globalUrls = (globalThreads ?? [])
          .map((t: { source_url: string | null }) => t.source_url)
          .filter((u: string | null): u is string => !!u);

        return { localHeadlines, globalUrls };
      });

      const story = await step.run("hunt-news", async () => {
        return huntNews(subreddit, dedupData.localHeadlines);
      });

      if (!story) {
        await step.run("log-skipped-no-news", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            subreddit_id: subreddit.id,
            status: "skipped",
            error_message: "No news story found",
          });
        });
        return { subreddit: subreddit.slug, status: "skipped_no_news" };
      }

      if (dedupData.globalUrls.includes(story.url)) {
        await step.run("log-skipped-duplicate", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            subreddit_id: subreddit.id,
            status: "skipped",
            error_message: "Duplicate URL",
          });
        });
        return { subreddit: subreddit.slug, status: "skipped_duplicate_url" };
      }

      const personas = await step.run("fetch-personas", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("personas")
          .select("*");
        return data ?? [];
      });

      if (personas.length === 0) {
        await step.run("log-skipped-no-personas", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            subreddit_id: subreddit.id,
            status: "skipped",
            error_message: "No personas available",
          });
        });
        return { subreddit: subreddit.slug, status: "skipped_no_personas" };
      }

      const opPersona = await step.run("pick-op-persona", async () => {
        return personas[Math.floor(Math.random() * personas.length)];
      });

      const threadContent = await step.run("generate-thread", async () => {
        return generateThread(subreddit, opPersona, story);
      });

      if (!threadContent) {
        await step.run("log-failed-thread", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            subreddit_id: subreddit.id,
            status: "failed",
            error_message: "Thread generation returned no content",
          });
        });
        return { subreddit: subreddit.slug, status: "failed_thread" };
      }

      const thread = await step.run("insert-thread", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
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
        return data;
      });

      if (!thread) {
        await step.run("log-failed-insert", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            subreddit_id: subreddit.id,
            status: "failed",
            error_message: "Failed to insert thread into database",
          });
        });
        return { subreddit: subreddit.slug, status: "failed_insert_thread" };
      }

      const commentChain = await step.run("generate-comments", async () => {
        return generateCommentChain(
          subreddit,
          personas,
          { title: threadContent.title, body: threadContent.body },
          opPersona.id
        );
      });

      await step.run("insert-comments", async () => {
        const supabase = getSupabase();
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
      });

      await step.run("revalidate-paths", async () => {
        revalidatePath(`/r/${subreddit.slug}`);
        revalidatePath(`/r/${subreddit.slug}/${thread.id}`);
        revalidatePath("/");
      });

      await step.run("log-success", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          subreddit_id: subreddit.id,
          status: "success",
          thread_id: thread.id,
        });
      });

      return {
        subreddit: subreddit.slug,
        status: "success",
        threadId: thread.id,
      };
    } catch (err) {
      await step.run("log-failure", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          subreddit_id: subreddit.id ?? subredditId,
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
        });
      });
      throw err;
    }
  }
);
