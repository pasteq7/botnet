import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration } from "@/lib/ai/content-router";
import { GENERATIVE_MODEL } from "@/lib/ai/client";
import type { Community } from "@/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

async function logGeneration(
  supabase: SupabaseClient,
  params: {
    community_id: string;
    status: "success" | "failed" | "skipped";
    model_used?: string;
    error_message?: string;
    thread_id?: string;
  }
) {
  await supabase.from("generation_logs").insert({
    community_id: params.community_id,
    status: params.status,
    model_used: params.model_used ?? GENERATIVE_MODEL,
    error_message: params.error_message ?? null,
    thread_id: params.thread_id ?? null,
  });
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
    triggers: [cron("0 */1 * * *")],
  },
  async ({ step }) => {
    const communities = await step.run("fetch-communities", async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("communities")
        .select("id, slug")
        .eq("is_active", true);
      return data ?? [];
    });

    if (communities.length === 0) {
      return { triggered: 0 };
    }

    await step.sendEvent(
      "fan-out-communities",
      communities.map((sub: { id: string; slug: string }) => ({
        name: "botnet/community.generate" as const,
        data: { communityId: sub.id, communitySlug: sub.slug },
      }))
    );

    return { triggered: communities.length };
  }
);

export const generateCommunityContent = inngest.createFunction(
  {
    id: "generate-community-content",
    name: "Generate Community Content",
    triggers: [{ event: "botnet/community.generate" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { communityId } = event.data as { communityId: string };
    let community!: Community;

    try {
      community = await step.run("fetch-community", async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();
        
        if (error || !data) {
          console.error(`Community fetch error for ID ${communityId}:`, error);
          throw new Error(`Community not found: ${communityId}${error ? ` (${error.message})` : ''}`);
        }
        return data;
      });

      const dedupData = await step.run("fetch-dedup-data", async () => {
        const supabase = getSupabase();

        const { data: recentThreads } = await supabase
          .from("threads")
          .select("source_url, source_headline")
          .eq("community_id", community.id)
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

      const contentPayload = await step.run("route-content", async () => {
        return routeContentGeneration(community, dedupData.localHeadlines);
      });

      if (!contentPayload) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            error_message: "No content generated for chosen mode",
          });
          return { community: community.slug, status: "skipped_no_content" };
        });
      }

      if (contentPayload.url && dedupData.globalUrls.includes(contentPayload.url)) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            error_message: "Duplicate URL detected",
          });
          return { community: community.slug, status: "skipped_duplicate_url" };
        });
      }

      const personas = await step.run("fetch-personas", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("personas")
          .select("*");
        return data ?? [];
      });

      if (personas.length === 0) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            error_message: "No personas available",
          });
          return { community: community.slug, status: "skipped_no_personas" };
        });
      }

      const opPersona = personas[Math.floor(Math.random() * personas.length)];

      const threadContent = await step.run("generate-thread", async () => {
        return generateThread(community, opPersona, contentPayload);
      });

      if (!threadContent) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "failed",
            error_message: "Thread generation returned no content",
          });
          return { community: community.slug, status: "failed_thread" };
        });
      }

      const thread = await step.run("insert-thread", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("threads")
          .insert({
            community_id: community.id,
            persona_id: opPersona.id,
            title: threadContent.title,
            body: threadContent.body,
            flair: threadContent.flair,
            source_url: contentPayload.url ?? null,
            source_headline: contentPayload.headline,
            content_mode: contentPayload.mode,
            simulated_upvotes: Math.floor(Math.random() * 2000) + 100,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();
        return data;
      });

      if (!thread) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "failed",
            error_message: "Failed to insert thread into database",
          });
          return { community: community.slug, status: "failed_insert_thread" };
        });
      }

      const commentChain = await step.run("generate-comments", async () => {
        return generateCommentChain(
          community,
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

      await step.run("revalidate-and-set-ready", async () => {
        revalidatePath(`/c/${community.slug}`);
        revalidatePath(`/c/${community.slug}/${thread.id}`);
        revalidatePath("/");
        const supabase = getSupabase();
        await supabase
          .from("threads")
          .update({ is_ready: true })
          .eq("id", thread.id);
      });

      return await step.run("log-and-return", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          community_id: community.id,
          status: "success",
          thread_id: thread.id,
        });
        return {
          community: community.slug,
          status: "success",
          threadId: thread.id,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.startsWith("Community not found:")) {
        return await step.run("log-and-return", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: communityId,
            status: "skipped",
            error_message: errorMessage,
          });
          return { community: communityId, status: "skipped_not_found" };
        });
      }

      await step.run("log-and-throw", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          community_id: community.id ?? communityId,
          status: "failed",
          error_message: errorMessage,
        });
      });
      throw err;
    }
  }
);
