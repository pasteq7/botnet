"use server"

import { createClient } from "@supabase/supabase-js";
import type { ActivityLog, ActivityLogDetails, TraceEntry } from "@/types";
import { getServerSupabaseUrl } from "@/lib/supabase/urls";

const API_BASE = "https://api.inngest.com/v1";

function getSupabase() {
  return createClient(
    getServerSupabaseUrl(),
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

function getEventData(event: Record<string, unknown>) {
  return event.data as Record<string, unknown> | undefined;
}

function normalizeSteps(run: Record<string, unknown> | null) {
  const rawSteps = run?.steps as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((s) => ({
    id: String(s.id ?? s.name ?? ""),
    name: String(s.name ?? s.id ?? "step"),
    status: String(s.status ?? "unknown"),
    started_at: String(s.started_at ?? s.startedAt ?? ""),
    ended_at: (s.ended_at ?? s.endedAt ?? null) as string | null,
    output: typeof s.output === "string" ? s.output : s.output ? JSON.stringify(s.output) : undefined,
    error: typeof s.error === "string" ? s.error : s.error ? JSON.stringify(s.error) : undefined,
  }));
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
      .select("id, community_id, thread_id, status, current_step, model_used, searcher_model, generator_model, tokens_used, error_message, search_strategy, created_at, communities(name, slug)", { count: "exact" });

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
        searcher_model: (log.searcher_model as string | null) ?? null,
        generator_model: (log.generator_model as string | null) ?? null,
        search_strategy: (log.search_strategy as string | null) ?? null,
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
      searcher_model: log.searcher_model ?? null,
      generator_model: log.generator_model ?? null,
      search_strategy: log.search_strategy ?? null,
      tokens_used: log.tokens_used ?? null,
      current_step: log.current_step ?? null,
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
            ? events.find((e: Record<string, unknown>) => getEventData(e)?.logId === log.id)
            ?? events.find((e: Record<string, unknown>) => {
              const eventData = getEventData(e);
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
              details.steps = normalizeSteps(firstRun);
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

export async function getLogsChartData(granularity: "day" | "hour" | "minute" = "day") {
  try {
    const supabase = getSupabase();

    const now = Date.now();
    const rangeMs =
      granularity === "day" ? 30 * 24 * 60 * 60 * 1000
      : granularity === "hour" ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const since = new Date(now - rangeMs).toISOString();

    const { data, error } = await supabase
      .from("generation_logs")
      .select("status, created_at")
      .gte("created_at", since);

    if (error) throw error;

    const countsByDate: Record<string, Record<string, number>> = {};

    for (const log of data ?? []) {
      const d = new Date(log.created_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      const date =
        granularity === "day"
          ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          : granularity === "hour"
          ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`
          : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

      if (!countsByDate[date]) {
        countsByDate[date] = {};
      }
      const status: string = log.status;
      countsByDate[date][status] = (countsByDate[date][status] ?? 0) + 1;
    }

    const chartData = Object.entries(countsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        success: counts.success ?? 0,
        failed: counts.failed ?? 0,
        skipped: counts.skipped ?? 0,
        running: counts.running ?? 0,
        queued: counts.queued ?? 0,
        cancelled: counts.cancelled ?? 0,
      }));

    return { data: chartData };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
