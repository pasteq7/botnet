"use server"

import { revalidatePath } from "next/cache";

const API_BASE = "https://api.inngest.com/v1";

const getHeaders = () => {
  const key = process.env.INNGEST_SIGNING_KEY;
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
};

export interface InngestRun {
  id: string;
  function_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  event_name?: string;
  output?: string;
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
}

const KNOWN_EVENT = "botnet/community.generate";

export async function getInngestRuns() {
  if (process.env.INNGEST_DEV === "1") {
    return { error: "Running locally. Please use the Inngest Dev Server UI (http://127.0.0.1:8288)." };
  }

  const headers = getHeaders();
  if (!headers) {
    return { error: "INNGEST_SIGNING_KEY is not configured." };
  }

  try {
    const res = await fetch(`${API_BASE}/events/${KNOWN_EVENT}/runs?limit=20`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Inngest API error (${res.status}): ${body}`);
    }

    const json = await res.json();
    return { data: (json.data || []) as InngestRun[] };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getRunDetails(runId: string) {
  const headers = getHeaders();
  if (!headers) {
    return { error: "INNGEST_SIGNING_KEY is not configured." };
  }

  try {
    const res = await fetch(`${API_BASE}/function-runs/${runId}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Failed to fetch run details (${res.status})`);

    const json = await res.json();
    return { data: json as InngestRunDetails };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function cancelRun(runId: string) {
  const headers = getHeaders();
  if (!headers) return;

  try {
    const res = await fetch(`${API_BASE}/function-runs/${runId}/cancel`, {
      method: "POST",
      headers,
    });

    if (!res.ok) throw new Error(`Failed to cancel run (${res.status})`);

    revalidatePath("/admin/inngest");
  } catch (error: unknown) {
    console.error("cancelRun error:", error instanceof Error ? error.message : String(error));
  }
}


