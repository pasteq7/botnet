import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { createCommunityGenerateEvent, createCommunityGenerateEvents } from "@/lib/inngest/log-id";
import { uuidv4 } from "@/lib/uuid";

function getFirstEventId(result: unknown) {
  const ids = (result as { ids?: unknown })?.ids;
  return Array.isArray(ids) && typeof ids[0] === "string" ? ids[0] : null;
}

async function createQueuedGenerationLog(params: {
  logId: string;
  communityId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_logs")
    .upsert(
      {
        id: params.logId,
        community_id: params.communityId,
        status: "queued",
        current_step: null,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("[trigger] Failed to create queued generation log:", error.message);
  }
}

async function recordInngestEvent(params: {
  logId: string;
  eventId: string | null;
}) {
  if (!params.eventId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_logs")
    .update({ inngest_event_id: params.eventId })
    .eq("id", params.logId);

  if (error) {
    console.error("[trigger] Failed to record Inngest event ID:", error.message);
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check if at least one active AI config exists before triggering generation
    // We use the authenticated client here to ensure consistency with the Admin UI
    const { count, error: countErr } = await supabase
      .from("ai_configs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (countErr) {
      console.error("[trigger] Error checking AI configs:", countErr.message);
    }

    if (!count || count === 0) {
      return NextResponse.json({
        error: "No active AI configuration found. Go to Admin > Settings to configure an AI provider (e.g., Gemini, OpenAI).",
        details: countErr ? `Database error: ${countErr.message}` : "No rows marked as active in ai_configs table."
      }, { status: 400 });
    }

    const { communityId } = await req.json();

    if (communityId === "all") {
      const { data: communities, error } = await supabase
        .from("communities")
        .select("id, slug")
        .eq("is_active", true);

      if (error) throw error;
      if (!communities?.length) {
        return NextResponse.json({ status: "no_active_communities" });
      }

      const events = createCommunityGenerateEvents(communities, uuidv4);

      await Promise.all(events.map((event) => createQueuedGenerationLog({
        logId: event.data.logId,
        communityId: event.data.communityId,
      })));

      const sent = await Promise.all(events.map((e) => inngest.send(e)));

      await Promise.all(events.map((event, i) => recordInngestEvent({
        logId: event.data.logId,
        eventId: getFirstEventId(sent[i]),
      })));

      return NextResponse.json({
        status: "triggered_all",
        count: communities.length,
        entries: communities.map((c, i) => ({
          communityId: c.id,
          communitySlug: c.slug,
          logId: events[i].data.logId,
          inngestEventId: getFirstEventId(sent[i]),
        })),
      });
    }

    if (!communityId) {
      return NextResponse.json({ error: "Missing Community ID" }, { status: 400 });
    }

    const { data: community } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .single();

    const event = createCommunityGenerateEvent(
      { id: communityId, slug: community?.slug ?? "" },
      uuidv4
    );
    const logId = event.data.logId;

    await createQueuedGenerationLog({ logId, communityId });

    const sent = await inngest.send(event);
    const inngestEventId = getFirstEventId(sent);

    await recordInngestEvent({ logId, eventId: inngestEventId });

    return NextResponse.json({ status: "triggered", communityId, logId, inngestEventId });
  } catch (err) {
    const error = err as Error;
    console.error("[trigger] Error:", error);
    return NextResponse.json({ error: `Failed to trigger: ${error.message}` }, { status: 500 });
  }
}
