// lib\inngest\functions.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { revalidatePath } from "next/cache";
import { resolvePipelineConfig } from "@/lib/ai/pipeline-config";
import { getSearchProvider, deriveSearchQuery } from "@/lib/ai/search";
import { uuidv4 } from "@/lib/uuid";
import type { PipelineSetup, PipelineSearchResult, PipelineContentResult, PipelineConversation } from "./pipeline-types";

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

interface TraceEntry {
  step: string;
  status: "success" | "failed" | "skipped";
  message: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
  model?: string;
  timestamp?: string;
}

function traceStep(
  trace: TraceEntry[],
  step: string,
  status: TraceEntry["status"],
  message: string,
  details?: Record<string, unknown>,
  startedAt?: number,
  model?: string
) {
  trace.push({
    step,
    status,
    message,
    details,
    model,
    timestamp: new Date().toISOString(),
    duration_ms: startedAt ? Date.now() - startedAt : undefined,
  });
}

async function upsertGenerationLog(
  supabase: SupabaseClient,
  params: {
    id: string;
    community_id: string;
    status: "queued" | "success" | "failed" | "skipped";
    current_step?: string | null;
    model_used?: string | null;
    searcher_model?: string | null;
    generator_model?: string | null;
    search_strategy?: string | null;
    error_message?: string | null;
    thread_id?: string | null;
    tokens_used?: number | null;
    trace?: TraceEntry[];
  }
) {
  const { error } = await supabase.from("generation_logs").upsert(
    {
      id: params.id,
      community_id: params.community_id,
      status: params.status,
      current_step: params.current_step ?? null,
      model_used: params.model_used ?? null,
      searcher_model: params.searcher_model ?? null,
      generator_model: params.generator_model ?? null,
      search_strategy: params.search_strategy ?? null,
      error_message: params.error_message ?? null,
      thread_id: params.thread_id ?? null,
      tokens_used: params.tokens_used ?? null,
      trace: params.trace ?? [],
    },
    { onConflict: "id" }
  );
  if (error) console.error("Failed to upsert generation log:", error.message);
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
  },
  { cron: "*/30 * * * *" },
  async ({ step }) => {

    const communities = await step.run("fetch-due-communities", async () => {
      const supabase = getSupabase();

      const { data: sConfig } = await supabase
        .from("scheduler_config")
        .select("max_per_run, default_interval_minutes, is_active")
        .maybeSingle();

      if (sConfig && !sConfig.is_active) {
        return "PAUSED";
      }

      const maxPerRun = sConfig?.max_per_run ?? 4;
      const defaultInterval = sConfig?.default_interval_minutes ?? 60;

      const { data: all } = await supabase
        .from("communities")
        .select("id, slug, generation_interval_minutes, last_generated_at")
        .eq("is_active", true);

      if (!all?.length) return [];

      const now = Date.now();

      return all
        .filter((c) => {
          const interval = (c.generation_interval_minutes ?? defaultInterval) * 60_000;
          const lastGen = c.last_generated_at ? new Date(c.last_generated_at).getTime() : 0;
          return now - lastGen >= interval;
        })
        .sort((a, b) => {
          const aLast = a.last_generated_at ? new Date(a.last_generated_at).getTime() : 0;
          const bLast = b.last_generated_at ? new Date(b.last_generated_at).getTime() : 0;
          return aLast - bLast;
        })
        .slice(0, maxPerRun);
    });

    if (communities === "PAUSED") return { triggered: 0, reason: "scheduler_paused" };
    if (!communities.length) return { triggered: 0, reason: "no_communities_due" };

    // Gate on AI config
    const hasAiConfig = await step.run("check-ai-config", async () => {
      const supabase = getSupabase();
      const { count } = await supabase
        .from("ai_configs")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return (count ?? 0) > 0;
    });

    if (!hasAiConfig) {
      console.warn("[cron] Skipped: no active AI config.");
      return { triggered: 0, reason: "no_ai_config" };
    }

    await step.sendEvent(
      "fan-out-communities",
      communities.map((c) => ({
        name: "botnet/community.generate" as const,
        data: { communityId: c.id, communitySlug: c.slug, logId: uuidv4() },
      }))
    );

    return { triggered: communities.length, communities: communities.map((c) => c.slug) };
  }
);

export const generateCommunityContent = inngest.createFunction(
  {
    id: "generate-community-content",
    name: "Generate Community Content",
    throttle: { limit: 3, period: "1m" },
    concurrency: { limit: 1, key: "event.data.communityId" },
    retries: 1,
  },
  { event: "botnet/community.generate" },
  async ({ event, step }) => {
    const { communityId, logId: eventLogId } = event.data as { communityId: string; logId?: string };
    const logId = eventLogId ?? uuidv4();
    const trace: TraceEntry[] = [];
    let totalTokens = 0;

    try {
      // STEP 1: Setup
      const setup: PipelineSetup = await step.run("setup", async (): Promise<PipelineSetup> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "setup",
        });

        const pipelineConfig = await resolvePipelineConfig();
        const generator = pipelineConfig.generator;
        const searcher = pipelineConfig.searcher;

        if (!generator && !searcher) {
          const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;
          const detail = !hasSecretKey 
            ? "SUPABASE_SECRET_KEY is missing from environment. Inngest cannot access database."
            : "Check that at least one AI config is marked as 'active' in Admin > Settings.";
            
          throw new Error(`AI Pipeline failure: No active Searcher or Generator found. ${detail}`);
        }

        const [
          { data: community, error: commErr },
          { data: recentThreads },
          { data: globalPersonas },
          { data: scopedPersonas },
        ] = await Promise.all([
          supabase.from("communities").select("*").eq("id", communityId).single(),
          supabase.from("threads")
            .select("source_url, source_headline")
            .eq("community_id", communityId)
            .order("published_at", { ascending: false })
            .limit(10),
          supabase.from("personas").select("*").eq("scope", "global"),
          supabase.from("personas")
            .select("*, persona_communities!inner(community_id)")
            .eq("persona_communities.community_id", communityId),
        ]);

        if (commErr || !community) throw new Error(`Community not found: ${communityId}`);

        const localHeadlines = (recentThreads ?? []).map(t => t.source_headline).filter(Boolean) as string[];

        const personas = [...(globalPersonas ?? []), ...(scopedPersonas ?? [])];

        if (personas.length < 4) {
          const { data: extraPersonas } = await supabase
            .from("personas")
            .select("*")
            .limit(10);
          const existingIds = new Set(personas.map(p => p.id));
          for (const p of extraPersonas ?? []) {
            if (!existingIds.has(p.id)) {
              personas.push(p);
              existingIds.add(p.id);
            }
          }
        }

        return { community, personas, localHeadlines, pipelineConfig };
      });

      const modelSearch = setup.pipelineConfig.searcher
        ? `${setup.pipelineConfig.searcher.provider}/${setup.pipelineConfig.searcher.model}`
        : null;
      const modelGen = setup.pipelineConfig.generator
        ? `${setup.pipelineConfig.generator.provider}/${setup.pipelineConfig.generator.model}`
        : null;

      const mode = pickContentMode(setup.community);

      // STEP 3: Search (Conditional)
      const searchStart = Date.now();
      const searchResult: PipelineSearchResult = await step.run("search", async (): Promise<PipelineSearchResult> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "searching",
        });

        const requiresSearch = mode === "news" || mode === "web-search";
        if (!requiresSearch || setup.pipelineConfig.effectiveSearchStrategy !== 'injected') {
          return { results: [], query: null, strategy: 'none' };
        }

        const sc = setup.pipelineConfig.externalSearch;
        if (!sc || !sc.apiKey) {
          console.warn(`[search] No active search config with API key — falling back to no search for ${setup.community.slug}`);
          return { results: [], query: null, strategy: 'injected' };
        }

        const query = deriveSearchQuery(setup.community.topic_prompt, setup.localHeadlines, setup.community.search_scope);
        console.log(`[search] Query: "${query}" via ${sc.provider} for ${setup.community.slug}`);

        try {
          const provider = getSearchProvider(sc.provider);
          const results = await provider.search(query, sc.apiKey, { maxResults: 5 });
          return { results: results ?? [], query, strategy: 'injected' };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[search] Search failed for ${setup.community.slug}: ${msg}`);
          return { results: [], query, strategy: 'injected' };
        }
      });

      const injectedResults = searchResult.results.filter(Boolean);

      if (searchResult.strategy === 'injected' && injectedResults.length > 0) {
        traceStep(trace, "Search", "success",
          `Search via ${setup.pipelineConfig.externalSearch?.provider ?? "unknown"}: ${injectedResults.length} results`,
          {
            provider: setup.pipelineConfig.externalSearch?.provider ?? null,
            query: searchResult.query,
            result_count: injectedResults.length,
            search_model: modelSearch,
          },
          searchStart,
          modelSearch ?? undefined,
        );
      } else if (searchResult.strategy === 'injected' && injectedResults.length === 0) {
        traceStep(trace, "Search", "failed",
          `Search returned no results for query: "${searchResult.query}"`,
          { provider: setup.pipelineConfig.externalSearch?.provider ?? null, query: searchResult.query },
          searchStart,
          modelSearch ?? undefined,
        );
      } else {
        // Search was skipped or strategy was 'none'
        // We only add a trace if search was skipped for a mode that didn't need it
        const requiresSearch = mode === "news" || mode === "web-search";
        if (!requiresSearch && setup.pipelineConfig.effectiveSearchStrategy === 'injected') {
          traceStep(trace, "Search", "skipped", `Skipped search: mode "${mode}" does not require external data.`, { mode }, searchStart);
        }
      }

      // STEP 4: Route & Generate Content Payload
      const routeStart = searchStart;
      const routeResult: PipelineContentResult = await step.run("route-content", async (): Promise<PipelineContentResult> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "routing",
        });

        const needsSearch = mode === "news" || mode === "web-search";
        if (needsSearch && setup.pipelineConfig.effectiveSearchStrategy === 'none') {
          return { payload: null, error: `Mode "${mode}" requires search, but search is not enabled in settings.`, tokensUsed: 0 };
        }

        if (needsSearch && setup.pipelineConfig.effectiveSearchStrategy === 'injected' && injectedResults.length === 0) {
          return { payload: null, error: `Mode "${mode}" requires external search, but search failed or returned no results.`, tokensUsed: 0 };
        }

        const result = await routeContentGeneration(
          setup.community,
          setup.localHeadlines,
          mode,
          { injectedSearchResults: injectedResults.length > 0 ? injectedResults : undefined }
        );

        if (result.payload) return { payload: result.payload, error: null, tokensUsed: result.tokensUsed ?? 0 };
        
        if (needsSearch) {
          return { 
            payload: null, 
            error: result.error ?? "No grounding data or API error", 
            tokensUsed: result.tokensUsed ?? 0,
            rawResponse: result.rawResponse
          };
        }

        const fallback = await routeContentGeneration(setup.community, setup.localHeadlines, "discussion");
        return { payload: fallback.payload ?? null, error: fallback.error ?? "Fallback discussion failed", tokensUsed: (result.tokensUsed ?? 0) + (fallback.tokensUsed ?? 0) };
      });

      totalTokens += routeResult.tokensUsed ?? 0;

      const t2 = Date.now();
      if (routeResult.error && !routeResult.payload) {
        traceStep(trace, "Routing", "failed",
          routeResult.error,
          { 
            attempted_mode: "unknown", 
            model_search: modelSearch, 
            model_gen: modelGen, 
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            raw_response: routeResult.rawResponse 
          },
          routeStart,
        );
      } else if (routeResult.payload) {
        const routingModel = routeResult.payload.mode === "news" || routeResult.payload.mode === "web-search"
          ? modelSearch
          : modelGen;
        traceStep(trace, "Routing", "success",
          `Mode: ${routeResult.payload.mode}`,
          {
            mode: routeResult.payload.mode,
            headline: routeResult.payload.headline?.slice(0, 120),
            url: routeResult.payload.url,
            is_fallback: !!routeResult.error,
            model_search: modelSearch,
            model_gen: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
          },
          routeStart,
          routingModel ?? undefined,
        );
      }

      // Handle Early Exits (Missing content, duplicates, missing personas)
      const contentPayload = routeResult.payload;

      const isDuplicateUrl = await step.run("check-duplicate-url", async () => {
        if (!contentPayload?.url || contentPayload.url.startsWith("https://www.google.com/search")) {
          return false;
        }
        const supabase = getSupabase();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("threads")
          .select("*", { count: "exact", head: true })
          .eq("source_url", contentPayload.url)
          .gte("published_at", twentyFourHoursAgo);
        return (count ?? 0) > 0;
      });

      if (!contentPayload || isDuplicateUrl || setup.personas.length === 0) {
        const reason = !contentPayload ? (routeResult.error || "No content generated") :
          (isDuplicateUrl ? "Duplicate URL detected" : "No personas available");

        traceStep(trace, "Conversation", "skipped", reason, { model_gen: modelGen }, t2, modelGen ?? undefined);

        const tokensUsed = totalTokens;
        const status = (reason.includes("requires") || reason.includes("failed")) ? "failed" : "skipped" as const;
        await step.run("log-skipped", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: status,
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            error_message: reason,
            tokens_used: tokensUsed,
            trace,
          });
        });
        return { community: setup.community.slug, status: "skipped", reason };
      }

      // STEP 4: Generate Thread
      const opPersona = setup.personas[Math.floor(Math.random() * setup.personas.length)];
      const generatorConfig = setup.pipelineConfig.generator ? {
        apiKey: setup.pipelineConfig.generator.apiKey,
        defaultModel: setup.pipelineConfig.generator.model,
        fallbackModel: setup.pipelineConfig.generator.fallbackModel,
        provider: setup.pipelineConfig.generator.provider,
        baseUrl: setup.pipelineConfig.generator.baseUrl,
        searchMode: setup.pipelineConfig.generator.searchMode,
        role: setup.pipelineConfig.generator.role,
      } : undefined;

      const threadResult = await step.run("generate-thread", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "generating",
        });
        return await generateThread(setup.community, opPersona, contentPayload, generatorConfig);
      });

      if (!threadResult) {
        traceStep(trace, "Conversation", "failed",
          "generateThread returned null — model likely returned malformed JSON or empty response",
          { model_gen: modelGen, content_mode: contentPayload.mode },
          t2,
          modelGen ?? undefined,
        );

        const tokensUsed = totalTokens;
        await step.run("log-failed-generation", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: "failed",
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            error_message: "Thread generation returned no content",
            tokens_used: tokensUsed,
            trace,
          });
        });
        return { community: setup.community.slug, status: "failed_thread" };
      }

      // STEP 5: Generate Comments
      const commentResult = await step.run("generate-comments", async () => {
        return await generateCommentChain(
          setup.community,
          setup.personas,
          { title: threadResult.title, body: threadResult.body },
          opPersona.id,
          undefined,
          generatorConfig
        );
      });

      const generatedConversation: PipelineConversation = {
        threadContent: threadResult,
        commentChain: commentResult.chain,
        isSafetyFiltered: !!commentResult.isFiltered,
        tokensUsed: (threadResult.tokensUsed ?? 0) + (commentResult.tokensUsed ?? 0),
      };

      totalTokens += generatedConversation.tokensUsed;

      const t3 = Date.now();
      traceStep(trace, "Conversation", "success",
        `Thread generated, ${generatedConversation.commentChain.length} comments, model: ${modelGen ?? "unknown"}`,
        {
          comment_count: generatedConversation.commentChain.length,
          title_length: generatedConversation.threadContent.title.length,
          body_length: generatedConversation.threadContent.body.length,
          flair: generatedConversation.threadContent.flair,
          model_gen: modelGen,
        },
        t2,
        modelGen ?? undefined,
      );

      // STEP 6: Save Everything to DB
      const tokensUsed = totalTokens;
      const threadId: string = await step.run("save-to-db", async (): Promise<string> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "saving",
        });

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
            is_safety_filtered: generatedConversation.isSafetyFiltered,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (threadErr || !thread) throw new Error(`Thread insert failed: ${threadErr?.message}`);

        // Insert Comments — batch root comments first, then replies
        const chain = generatedConversation.commentChain;
        const rootComments = chain.filter(c => c.parentIndex === null);
        const replyComments = chain.filter(c => c.parentIndex !== null);

        const { data: rootInserted, error: rootErr } = await supabase
          .from("comments")
          .insert(rootComments.map(c => ({
            thread_id: thread.id,
            parent_comment_id: null,
            persona_id: c.persona.id,
            body: c.body,
            depth: 0,
          })))
          .select("id");

        if (rootErr) throw new Error(`Root comment insert failed: ${rootErr.message}`);

        const insertedIds = [...(rootInserted ?? []).map(r => r.id)];

        if (replyComments.length > 0) {
          const replyRows = replyComments.map(c => ({
            thread_id: thread.id,
            parent_comment_id: insertedIds[c.parentIndex!],
            persona_id: c.persona.id,
            body: c.body,
            depth: 1,
          }));

          const { data: replyInserted, error: replyErr } = await supabase
            .from("comments")
            .insert(replyRows)
            .select("id");

          if (replyErr) throw new Error(`Reply comment insert failed: ${replyErr.message}`);
          insertedIds.push(...(replyInserted ?? []).map(r => r.id));
        }

        // Finalize state — parallelize independent operations
        const finalCount = generatedConversation.commentChain.length;
        await Promise.all([
          supabase.from("threads").update({ comments_count: finalCount, is_ready: true }).eq("id", thread.id),
          supabase.from("communities").update({ last_generated_at: new Date().toISOString() }).eq("id", setup.community.id),
          upsertGenerationLog(supabase, {
            id: logId,
            community_id: setup.community.id,
            status: "success",
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            thread_id: thread.id,
            tokens_used: tokensUsed,
            trace,
          }),
        ]);

        return thread.id;
      });

      traceStep(trace, "Database", "success",
        `Thread and ${generatedConversation.commentChain.length} comments persisted`,
        { thread_id: threadId, community_id: setup.community.id, model_search: modelSearch, model_gen: modelGen },
        t3,
        modelGen ?? modelSearch ?? undefined,
      );

      // STEP 7: Revalidate Paths
      await step.run("revalidate-paths", async () => {
        revalidatePath(`/c/${setup.community.slug}`);
        revalidatePath(`/c/${setup.community.slug}/${threadId}`);
        revalidatePath("/");
      });

      return { community: setup.community.slug, status: "success", threadId };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      const failedStep = errorMessage.includes("AI configuration") ? "Setup" :
        errorMessage.includes("not found") ? "Setup" :
          errorMessage.includes("Thread insert") ? "Database" :
            errorMessage.includes("Comment insert") ? "Database" : "Unknown";

      traceStep(trace, failedStep, "failed", errorMessage, { community_id: communityId }, undefined, undefined);

      const tokensUsed = totalTokens;
      await step.run("log-fatal-failure", async () => {
        await upsertGenerationLog(getSupabase(), {
          id: logId,
          community_id: communityId,
          status: errorMessage.includes("AI configuration") ? "skipped" : errorMessage.includes("not found") ? "skipped" : "failed",
          current_step: "done",
          error_message: errorMessage,
          tokens_used: tokensUsed,
          trace,
        });
      });
      throw err;
    }
  }
);
