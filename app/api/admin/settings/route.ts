import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { clearActiveAiConfigCache } from "@/lib/ai/client";
import {
  DEFAULT_MAX_COMMENTS_PER_THREAD,
  DEFAULT_MAX_THREADS_PER_TICK,
  DEFAULT_MIN_COMMENTS_PER_THREAD,
  DEFAULT_POSTING_INTERVAL_MINUTES,
  DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
  MAX_COMMENTS_PER_THREAD,
  MAX_THREADS_PER_TICK,
} from "@/lib/constants";

function maskKey(key: string): string {
  const visible = key.slice(-4);
  return "•".repeat(8) + visible;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const section = req.nextUrl.searchParams.get("section");

  if (section === "scheduler") {
    const { data } = await supabase
      .from("scheduler_config")
      .select("*")
      .maybeSingle();
    return NextResponse.json(data ?? {
      default_interval_minutes: DEFAULT_POSTING_INTERVAL_MINUTES,
      max_per_run: DEFAULT_MAX_THREADS_PER_TICK,
      default_min_comments_per_thread: DEFAULT_MIN_COMMENTS_PER_THREAD,
      default_max_comments_per_thread: DEFAULT_MAX_COMMENTS_PER_THREAD,
      is_active: true,
    });
  }

  if (section === "interface") {
    const { data } = await supabase
      .from("scheduler_config")
      .select("sidebar_generation_button_enabled")
      .maybeSingle();
    return NextResponse.json(data ?? {
      sidebar_generation_button_enabled: DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
    });
  }

  const { data: configs, error } = await supabase
    .from("ai_configs")
    .select("*")
    .order("provider")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (configs ?? []).map((c) => {
    try {
      const decrypted = decrypt(c.encrypted_key);
      return { ...c, encrypted_key: maskKey(decrypted) };
    } catch {
      return { ...c, encrypted_key: "[decryption failed]" };
    }
  });

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body._section === "scheduler") {
      const { default_interval_minutes, is_active } = body;
      const max_per_run = Math.min(
        Math.max(Number.parseInt(String(body.max_per_run), 10) || 0, 0),
        MAX_THREADS_PER_TICK
      );
      const default_min_comments_per_thread = Math.min(
        Math.max(Number.parseInt(String(body.default_min_comments_per_thread), 10) || 0, 0),
        MAX_COMMENTS_PER_THREAD
      );
      const default_max_comments_per_thread = Math.min(
        Math.max(
          Number.parseInt(String(body.default_max_comments_per_thread), 10) || default_min_comments_per_thread,
          default_min_comments_per_thread
        ),
        MAX_COMMENTS_PER_THREAD
      );
      const { data: existing } = await supabase
        .from("scheduler_config")
        .select("id")
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from("scheduler_config")
          .update({
            default_interval_minutes,
            max_per_run,
            default_min_comments_per_thread,
            default_max_comments_per_thread,
            is_active,
          })
          .eq("id", existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("scheduler_config")
          .insert({
            default_interval_minutes,
            max_per_run,
            default_min_comments_per_thread,
            default_max_comments_per_thread,
            is_active: is_active ?? true,
          })
          .select()
          .single();
      }

      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      return NextResponse.json(result.data);
    }

    if (body._section === "interface") {
      const sidebar_generation_button_enabled =
        body.sidebar_generation_button_enabled ?? DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED;
      const { data: existing } = await supabase
        .from("scheduler_config")
        .select("id")
        .maybeSingle();

      const result = existing
        ? await supabase
          .from("scheduler_config")
          .update({ sidebar_generation_button_enabled })
          .eq("id", existing.id)
          .select("sidebar_generation_button_enabled")
          .single()
        : await supabase
          .from("scheduler_config")
          .insert({
            default_interval_minutes: DEFAULT_POSTING_INTERVAL_MINUTES,
            max_per_run: DEFAULT_MAX_THREADS_PER_TICK,
            default_min_comments_per_thread: DEFAULT_MIN_COMMENTS_PER_THREAD,
            default_max_comments_per_thread: DEFAULT_MAX_COMMENTS_PER_THREAD,
            is_active: true,
            sidebar_generation_button_enabled,
          })
          .select("sidebar_generation_button_enabled")
          .single();

      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      return NextResponse.json(result.data);
    }

    const { provider, label, api_key, default_model, fallback_model, is_active, base_url, role, search_mode } = body;

    if (!provider || !label || !default_model || (!api_key && provider !== "local")) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const encrypted_key = encrypt(api_key || "");
    const resolvedRole = role || 'full';
    const resolvedSearchMode = search_mode || 'none';

    if (is_active) {
      await supabase
        .from("ai_configs")
        .update({ is_active: false })
        .eq("is_active", true)
        .eq("role", resolvedRole);
    }

    const { data, error } = await supabase
      .from("ai_configs")
      .insert({
        provider,
        label,
        encrypted_key,
        default_model,
        fallback_model: fallback_model || null,
        role: resolvedRole,
        search_mode: resolvedSearchMode,
        is_active: is_active ?? false,
        base_url: base_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    clearActiveAiConfigCache();

    const decrypted = decrypt(data.encrypted_key);
    return NextResponse.json({ ...data, encrypted_key: maskKey(decrypted) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 });

    if (updates.is_active === true) {
      let role = updates.role;
      if (!role) {
        const { data: existing } = await supabase.from("ai_configs").select("role").eq("id", id).single();
        role = existing?.role || 'full';
      }

      let conflictingRoles: string[] = [];
      if (role === "full") {
        conflictingRoles = ["full", "searcher", "generator"];
      } else if (role === "searcher") {
        conflictingRoles = ["full", "searcher"];
      } else if (role === "generator") {
        conflictingRoles = ["full", "generator"];
      }

      await supabase
        .from("ai_configs")
        .update({ is_active: false })
        .in("role", conflictingRoles)
        .eq("is_active", true)
        .neq("id", id);
    }

    if (updates.api_key) {
      updates.encrypted_key = encrypt(updates.api_key);
      delete updates.api_key;
    }

    const { data, error } = await supabase
      .from("ai_configs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    clearActiveAiConfigCache();

    const decrypted = decrypt(data.encrypted_key);
    return NextResponse.json({ ...data, encrypted_key: maskKey(decrypted) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 });

  const { data: config } = await supabase
    .from("ai_configs")
    .select("is_active")
    .eq("id", id)
    .single();

  if (config?.is_active) {
    return NextResponse.json({ error: "Cannot delete an active config. Deactivate it first." }, { status: 400 });
  }

  const { error } = await supabase.from("ai_configs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  clearActiveAiConfigCache();
  return NextResponse.json({ success: true });
}
