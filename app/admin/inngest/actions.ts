"use server"

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.inngest.com/v1";

export interface InngestRun {
  id: string;
  community_id: string;
  community_name: string | null;
  community_slug: string | null;
  thread_id: string | null;
  status: string;
  model_used: string | null;
  tokens_used: number | null;
  error_message: string | null;
  created_at: string;
}

export interface InngestStep {
  id: string;
  name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  output?: string;
  error?: string;
}

export interface InngestRunDetails extends InngestRun {
  steps?: InngestStep[];
  inngest_event_id?: string;
}

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

export async function getInngestRuns() {
  try {
    const supabase = getSupabase();
    const { data: logs, error: dbError } = await supabase
      .from("generation_logs")
      .select("*, communities(name, slug)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (dbError) throw new Error(`Database query failed: ${dbError.message}`);

    const runs: InngestRun[] = (logs ?? []).map((log: any) => ({
      id: log.id,
      community_id: log.community_id,
      community_name: log.communities?.name ?? null,
      community_slug: log.communities?.slug ?? null,
      thread_id: log.thread_id ?? null,
      status: log.status,
      model_used: log.model_used ?? null,
      tokens_used: log.tokens_used ?? null,
      error_message: log.error_message ?? null,
      created_at: log.created_at,
    }));

    return { data: runs };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getRunDetails(runId: string) {
  try {
    const supabase = getSupabase();
    const { data: log, error: dbError } = await supabase
      .from("generation_logs")
      .select("*, communities(name, slug)")
      .eq("id", runId)
      .single();

    if (dbError || !log) {
      return { error: "Run not found." };
    }

    const details: InngestRunDetails = {
      id: log.id,
      community_id: log.community_id,
      community_name: log.communities?.name ?? null,
      community_slug: log.communities?.slug ?? null,
      thread_id: log.thread_id ?? null,
      status: log.status,
      model_used: log.model_used ?? null,
      tokens_used: log.tokens_used ?? null,
      error_message: log.error_message ?? null,
      created_at: log.created_at,
    };

    // Optional enrichment: Inngest v1 API step traces
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
            ? events.find((e: any) => e.data?.communityId === log.community_id)
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
                details.steps = Array.isArray(firstRun.steps)
                  ? firstRun.steps.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      status: s.status,
                      started_at: s.started_at,
                      ended_at: s.ended_at,
                      output: s.output,
                      error: s.error,
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

export async function cancelRun(_runId: string) {
  return;
}
