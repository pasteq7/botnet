"use server"

import { createClient } from "@supabase/supabase-js";
import type { ActivityLog, ActivityLogDetails, TraceEntry } from "@/types";

const API_BASE = "https://api.inngest.com/v1";

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

async function getSigningHeaders() {
  const key = process.env.INNGEST_SIGNING_KEY;
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function getLogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  communityId?: string;
}) {
  try {
    const supabase = getSupabase();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("generation_logs")
      .select("*, communities(name, slug)", { count: "exact" });

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.communityId) {
      query = query.eq("community_id", params.communityId);
    }

    const { data: logs, error: dbError, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) throw new Error(`Database query failed: ${dbError.message}`);

    const items: ActivityLog[] = (logs ?? []).map((log: Record<string, unknown>) => {
      const communities = log.communities as Record<string, unknown> | null;
      return {
        id: log.id as string,
        community_id: log.community_id as string,
        community_name: (communities?.name as string | null) ?? null,
        community_slug: (communities?.slug as string | null) ?? null,
        thread_id: (log.thread_id as string | null) ?? null,
        status: log.status as string,
        model_used: (log.model_used as string | null) ?? null,
        model_search: (log.model_search as string | null) ?? null,
        model_gen: (log.model_gen as string | null) ?? null,
        tokens_used: (log.tokens_used as number | null) ?? null,
        current_step: (log.current_step as string | null) ?? null,
        error_message: (log.error_message as string | null) ?? null,
        created_at: log.created_at as string,
      };
    });

    return {
      data: items,
      total: count ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getLogDetails(logId: string) {
  try {
    const supabase = getSupabase();
    const { data: log, error: dbError } = await supabase
      .from("generation_logs")
      .select("*, communities(name, slug)")
      .eq("id", logId)
      .single();

    if (dbError || !log) {
      return { error: "Log entry not found." };
    }

    const rawTrace = log.trace as Record<string, unknown>[] | null;
    const details: ActivityLogDetails = {
      id: log.id,
      community_id: log.community_id,
      community_name: log.communities?.name ?? null,
      community_slug: log.communities?.slug ?? null,
      thread_id: log.thread_id ?? null,
      status: log.status,
      model_used: log.model_used ?? null,
      model_search: log.model_search ?? null,
      model_gen: log.model_gen ?? null,
      tokens_used: log.tokens_used ?? null,
      error_message: log.error_message ?? null,
      created_at: log.created_at,
      trace: Array.isArray(rawTrace) ? (rawTrace as unknown as TraceEntry[]) : undefined,
    };

    const headers = await getSigningHeaders();
    if (headers && log.community_id) {
      try {
        const eventsRes = await fetch(
          `${API_BASE}/events?name=botnet/community.generate`,
          { headers, cache: "no-store" }
        );

        if (eventsRes.ok) {
          const eventsJson = await eventsRes.json();
          const events = eventsJson.data ?? eventsJson ?? [];
          const match = Array.isArray(events)
            ? events.find((e: Record<string, unknown>) => {
                const eventData = e.data as Record<string, unknown> | undefined;
                return eventData?.communityId === log.community_id;
              })
            : null;

          if (match) {
            details.inngest_event_id = match.id;
            const runsRes = await fetch(
              `${API_BASE}/events/${match.id}/runs`,
              { headers, cache: "no-store" }
            );

            if (runsRes.ok) {
              const runsJson = await runsRes.json();
              const inngestRuns = runsJson.data ?? runsJson ?? [];
              const firstRun = Array.isArray(inngestRuns) ? inngestRuns[0] : null;
              if (firstRun) {
                const rawSteps = firstRun.steps as Array<Record<string, unknown>> | undefined;
                details.steps = Array.isArray(rawSteps)
                  ? rawSteps.map((s) => ({
                      id: s.id as string,
                      name: s.name as string,
                      status: s.status as string,
                      started_at: s.started_at as string,
                      ended_at: s.ended_at as string | null,
                      output: s.output as string | undefined,
                      error: s.error as string | undefined,
                    }))
                  : [];
              }
            }
          }
        }
      } catch {
        // Enrichment is optional — silently continue
      }
    }

    return { data: details };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}


