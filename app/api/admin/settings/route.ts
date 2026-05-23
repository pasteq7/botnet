import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { clearActiveAiConfigCache } from "@/lib/ai/client";
import { getInterfaceSettings, withBackgroundImageUrl } from "@/lib/interface-settings";
import {
  DEFAULT_MAX_COMMENTS_PER_THREAD,
  DEFAULT_MAX_THREADS_PER_TICK,
  DEFAULT_MIN_COMMENTS_PER_THREAD,
  DEFAULT_POSTING_INTERVAL_MINUTES,
  ALLOWED_BACKGROUND_IMAGE_TYPES,
  INTERFACE_ASSETS_BUCKET,
  MAX_BACKGROUND_IMAGE_BYTES,
  MAX_COMMENTS_PER_THREAD,
  MAX_THREADS_PER_TICK,
} from "@/lib/constants";

function maskKey(key: string): string {
  const visible = key.slice(-4);
  return "•".repeat(8) + visible;
}

function getConflictingRoles(role: string): string[] {
  if (role === "full") return ["full", "searcher", "generator"];
  if (role === "searcher") return ["full", "searcher"];
  if (role === "generator") return ["full", "generator"];
  return ["full"];
}

function providerLabel(provider: string): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function resolveConfigLabel(label: unknown, provider: string, defaultModel: string): string {
  const customLabel = typeof label === "string" ? label.trim() : "";
  return customLabel || `${providerLabel(provider)}${defaultModel ? ` - ${defaultModel}` : ""}`;
}

function validateBackgroundImageFile(file: File) {
  if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(file.type as typeof ALLOWED_BACKGROUND_IMAGE_TYPES[number])) {
    throw new Error("Background image must be a PNG, JPEG, or WebP file");
  }

  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    throw new Error(`Background image must be ${Math.round(MAX_BACKGROUND_IMAGE_BYTES / 1024)}KB or smaller`);
  }
}

function backgroundImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  return "webp";
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
    const settings = await getInterfaceSettings(supabase);
    return NextResponse.json(settings);
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
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      if (formData.get("_section") !== "interface") {
        return NextResponse.json({ error: "Invalid multipart settings section" }, { status: 400 });
      }

      const sidebar_generation_button_enabled =
        formData.get("sidebar_generation_button_enabled") === "true";
      const background_image_enabled =
        formData.get("background_image_enabled") !== "false";
      const useDefaultBackground = formData.get("use_default_background") === "true";
      const backgroundImage = formData.get("background_image");

      const { data: existing } = await supabase
        .from("interface_config")
        .select("background_image_path")
        .maybeSingle();

      let background_image_path = existing?.background_image_path ?? null;

      if (backgroundImage instanceof File && backgroundImage.size > 0) {
        validateBackgroundImageFile(backgroundImage);
        const path = `backgrounds/background-${Date.now()}.${backgroundImageExtension(backgroundImage)}`;
        const { error: uploadError } = await supabase.storage
          .from(INTERFACE_ASSETS_BUCKET)
          .upload(path, backgroundImage, {
            contentType: backgroundImage.type,
            upsert: false,
          });

        if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

        if (background_image_path) {
          await supabase.storage.from(INTERFACE_ASSETS_BUCKET).remove([background_image_path]);
        }
        background_image_path = path;
      } else if (useDefaultBackground) {
        if (background_image_path) {
          await supabase.storage.from(INTERFACE_ASSETS_BUCKET).remove([background_image_path]);
        }
        background_image_path = null;
      }

      const result = await supabase
        .from("interface_config")
        .upsert({
          id: true,
          sidebar_generation_button_enabled,
          background_image_enabled,
          background_image_path,
          updated_at: new Date().toISOString(),
        })
        .select("sidebar_generation_button_enabled, background_image_enabled, background_image_path")
        .single();

      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      return NextResponse.json(withBackgroundImageUrl(supabase, result.data));
    }

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

    const { provider, label, api_key, default_model, fallback_model, is_active, base_url, role, search_mode } = body;

    if (!provider || !default_model || (!api_key && provider !== "local")) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const encrypted_key = encrypt(api_key || "");
    const resolvedLabel = resolveConfigLabel(label, provider, default_model);
    const resolvedRole = role || 'full';
    const resolvedSearchMode = search_mode || 'none';

    if (is_active) {
      await supabase
        .from("ai_configs")
        .update({ is_active: false })
        .eq("is_active", true)
        .in("role", getConflictingRoles(resolvedRole));
    }

    const { data, error } = await supabase
      .from("ai_configs")
      .insert({
        provider,
        label: resolvedLabel,
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON" },
      { status: 400 }
    );
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

    const { data: existingConfig } = await supabase
      .from("ai_configs")
      .select("provider, role, default_model")
      .eq("id", id)
      .single();

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    if (updates.is_active === true) {
      let role = updates.role;
      if (!role) role = existingConfig.role || 'full';

      const conflictingRoles = getConflictingRoles(role);

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

    if (Object.prototype.hasOwnProperty.call(updates, "label")) {
      updates.label = resolveConfigLabel(
        updates.label,
        existingConfig.provider,
        updates.default_model ?? existingConfig.default_model
      );
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
