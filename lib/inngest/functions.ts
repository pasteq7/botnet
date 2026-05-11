// lib\inngest\functions.ts
import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { getActiveAiConfig } from "@/lib/ai/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
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
  const { error } = await supabase.from("generation_logs").insert({
    community_id: params.community_id,
    status: params.status,
    model_used: params.model_used ?? null,
    error_message: params.error_message ?? null,
    thread_id: params.thread_id ?? null,
  });
  if (error) console.error("Failed to log generation:", error.message);
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
      const { data } = await supabase.from("communities").select("id, slug").eq("is_active", true);
      return data ?? [];
    });

    if (communities.length === 0) return { triggered: 0 };

    const selected = [...communities].sort(() => Math.random() - 0.5).slice(0, 4);

    await step.sendEvent("fan-out-communities", selected.map(c => ({
      name: "botnet/community.generate" as const,
      data: { communityId: c.id, communitySlug: c.slug },
    })));

    return { triggered: selected.length };
  }
);

export const generateCommunityContent = inngest.createFunction(
  {
    id: "generate-community-content",
    name: "Generate Community Content",
    triggers: [{ event: "botnet/community.generate" }],
    throttle: { limit: 4, period: "1m" },
    concurrency: { limit: 1, key: "event.data.communityId" },
    retries: 1,
  },
  async ({ event, step }) => {
    const { communityId } = event.data as { communityId: string };

    try {
      // STEP 1: Setup Data (Combines 4 previous steps into 1)
      const setup = await step.run("setup-data", async () => {
        const config = await getActiveAiConfig();
        const activeModel = config ? `${config.provider}/${config.defaultModel}` : "unknown";
        const supabase = getSupabase();

        const { data: community, error: commErr } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();

        if (commErr || !community) throw new Error(`Community not found: ${communityId}`);

        const { data: recentThreads } = await supabase
          .from("threads")
          .select("source_url, source_headline")
          .eq("community_id", community.id)
          .order("published_at", { ascending: false })
          .limit(10);
        const localHeadlines = (recentThreads ?? []).map(t => t.source_headline).filter(Boolean) as string[];

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: globalThreads } = await supabase
          .from("threads")
          .select("source_url")
          .gte("published_at", twentyFourHoursAgo);
        const globalUrls = (globalThreads ?? []).map(t => t.source_url).filter(Boolean) as string[];

        const { data: personas } = await supabase.from("personas").select("*");

        return { activeModel, community, localHeadlines, globalUrls, personas: personas ?? [] };
      });

      // STEP 2: Route & Generate Initial Content Payload
      const routeResult = await step.run("route-content", async () => {
        const mode = pickContentMode(setup.community);
        const result = await routeContentGeneration(setup.community, setup.localHeadlines, mode);

        if (result.payload) return { payload: result.payload, error: null };

        if (mode === "news" || mode === "web-search") {
          return { payload: null, error: result.error ?? "No grounding data or API error" };
        }

        const fallback = await routeContentGeneration(setup.community, setup.localHeadlines, "discussion");
        return { payload: fallback.payload ?? null, error: fallback.error ?? "Fallback discussion failed" };
      });

      // Handle Early Exits (Missing content, duplicates, missing personas)
      const contentPayload = routeResult.payload;
      const isDuplicateUrl = contentPayload?.url && !contentPayload.url.startsWith("https://www.google.com/search") && setup.globalUrls.includes(contentPayload.url);

      if (!contentPayload || isDuplicateUrl || setup.personas.length === 0) {
        const reason = !contentPayload ? (routeResult.error || "No content generated") :
          (isDuplicateUrl ? "Duplicate URL detected" : "No personas available");

        await step.run("log-skipped", async () => {
          await logGeneration(getSupabase(), {
            community_id: setup.community.id,
            status: "skipped",
            model_used: setup.activeModel,
            error_message: reason,
          });
        });
        return { community: setup.community.slug, status: "skipped", reason };
      }

      // STEP 3: Generate Conversation (Combines Thread + Comments AI logic)
      const opPersona = setup.personas[Math.floor(Math.random() * setup.personas.length)];
      const generatedConversation = await step.run("generate-conversation", async () => {
        const threadContent = await generateThread(setup.community, opPersona, contentPayload);
        if (!threadContent) return null;

        const commentChain = await generateCommentChain(
          setup.community,
          setup.personas,
          { title: threadContent.title, body: threadContent.body },
          opPersona.id
        );
        return { threadContent, commentChain };
      });

      if (!generatedConversation) {
        await step.run("log-failed-generation", async () => {
          await logGeneration(getSupabase(), {
            community_id: setup.community.id,
            status: "failed",
            model_used: setup.activeModel,
            error_message: "Thread generation returned no content",
          });
        });
        return { community: setup.community.slug, status: "failed_thread" };
      }

      // STEP 4: Save Everything to DB (Combines Thread insert, Comment inserts, Count update, and Success log)
      const threadId = await step.run("save-to-db", async () => {
        const supabase = getSupabase();

        // Insert Thread
        const { data: thread, error: threadErr } = await supabase
          .from("threads")
          .insert({
            community_id: setup.community.id,
            persona_id: opPersona.id,
            title: generatedConversation.threadContent.title,
            body: generatedConversation.threadContent.body,
            flair: generatedConversation.threadContent.flair,
            source_url: contentPayload.url || null,
            source_headline: contentPayload.headline,
            content_mode: contentPayload.mode,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (threadErr || !thread) throw new Error(`Thread insert failed: ${threadErr?.message}`);

        // Insert Comments
        const insertedCommentIds: string[] = [];
        for (const comment of generatedConversation.commentChain) {
          const parentId = comment.parentIndex !== null ? insertedCommentIds[comment.parentIndex] : null;
          const { data: inserted, error } = await supabase
            .from("comments")
            .insert({
              thread_id: thread.id,
              parent_comment_id: parentId ?? null,
              persona_id: comment.persona.id,
              body: comment.body,
              depth: parentId ? 1 : 0,
            })
            .select("id")
            .single();

          if (error) throw new Error(`Comment insert failed: ${error.message}`);
          insertedCommentIds.push(inserted.id);
        }

        // Finalize state
        const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("thread_id", thread.id);
        await supabase.from("threads").update({ comments_count: count ?? 0, is_ready: true }).eq("id", thread.id);

        await logGeneration(supabase, {
          community_id: setup.community.id,
          status: "success",
          model_used: setup.activeModel,
          thread_id: thread.id,
        });

        return thread.id;
      });

      // STEP 5: Revalidate Paths
      await step.run("revalidate-paths", async () => {
        revalidatePath(`/c/${setup.community.slug}`);
        revalidatePath(`/c/${setup.community.slug}/${threadId}`);
        revalidatePath("/");
      });

      return { community: setup.community.slug, status: "success", threadId };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await step.run("log-fatal-failure", async () => {
        await logGeneration(getSupabase(), {
          community_id: communityId,
          status: errorMessage.includes("not found") ? "skipped" : "failed",
          error_message: errorMessage,
        });
      });
      throw err;
    }
  }
);