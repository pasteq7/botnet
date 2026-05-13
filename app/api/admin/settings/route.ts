import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { clearActiveAiConfigCache } from "@/lib/ai/client";

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
    return NextResponse.json(data ?? { default_interval_minutes: 60, max_per_run: 4 });
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
      const { default_interval_minutes, max_per_run } = body;
      const { data: existing } = await supabase
        .from("scheduler_config")
        .select("id")
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from("scheduler_config")
          .update({ default_interval_minutes, max_per_run })
          .eq("id", existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("scheduler_config")
          .insert({ default_interval_minutes, max_per_run, is_active: true })
          .select()
          .single();
      }

      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      return NextResponse.json(result.data);
    }

    const { provider, label, api_key, default_model, fallback_model, is_active, purpose } = body;

    if (!provider || !label || !api_key || !default_model) {
      return NextResponse.json({ error: "Missing required fields: provider, label, api_key, default_model" }, { status: 400 });
    }

    const encrypted_key = encrypt(api_key);

    if (is_active) {
      const p = purpose || 'any';
      if (p === 'any') {
        await supabase
          .from("ai_configs")
          .update({ is_active: false })
          .eq("is_active", true)
          .in("purpose", ["search", "generation"]);
      } else {
        await supabase
          .from("ai_configs")
          .update({ is_active: false })
          .eq("is_active", true)
          .in("purpose", [p, 'any']);
      }
    }

    const { data, error } = await supabase
      .from("ai_configs")
      .insert({
        provider,
        label,
        encrypted_key,
        default_model,
        fallback_model: fallback_model || null,
        purpose: purpose || 'any',
        is_active: is_active ?? false,
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
      const purpose = updates.purpose || (await supabase.from("ai_configs").select("purpose").eq("id", id).single()).data?.purpose || 'any';
      if (purpose === 'any') {
        await supabase
          .from("ai_configs")
          .update({ is_active: false })
          .eq("is_active", true)
          .neq("id", id)
          .in("purpose", ["search", "generation"]);
      } else {
        await supabase
          .from("ai_configs")
          .update({ is_active: false })
          .eq("is_active", true)
          .neq("id", id)
          .in("purpose", [purpose, 'any']);
      }
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
