import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_BACKGROUND_IMAGE_ENABLED,
  DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
  INTERFACE_ASSETS_BUCKET,
} from "@/lib/constants";

// Supabase SSR and service-role clients infer slightly different schema generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, string, any, any, any>;

export type InterfaceSettings = {
  sidebar_generation_button_enabled: boolean;
  background_image_enabled: boolean;
  background_image_path: string | null;
  background_image_url: string | null;
};

type InterfaceConfigRow = {
  sidebar_generation_button_enabled: boolean;
  background_image_enabled: boolean;
  background_image_path: string | null;
};

function publicBackgroundImageUrl(supabase: AnySupabaseClient, path: string | null) {
  return path
    ? supabase.storage.from(INTERFACE_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl
    : null;
}

function legacyDataUrlParts(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const extension = match[1] === "image/png" ? "png" : match[1] === "image/jpeg" ? "jpg" : "webp";
  return {
    contentType: match[1],
    extension,
    body: Buffer.from(match[2], "base64"),
  };
}

export function withBackgroundImageUrl(
  supabase: AnySupabaseClient,
  config: InterfaceConfigRow
): InterfaceSettings {
  return {
    ...config,
    background_image_url: publicBackgroundImageUrl(supabase, config.background_image_path),
  };
}

export async function getInterfaceSettings(supabase: AnySupabaseClient): Promise<InterfaceSettings> {
  const { data: config } = await supabase
    .from("interface_config")
    .select("sidebar_generation_button_enabled, background_image_enabled, background_image_path")
    .maybeSingle();

  if (config?.background_image_path) {
    return withBackgroundImageUrl(supabase, config);
  }

  const { data: legacyConfig } = await supabase
    .from("scheduler_config")
    .select("sidebar_generation_button_enabled, background_image_enabled, background_image_data_url")
    .maybeSingle();

  const baseConfig: InterfaceConfigRow = {
    sidebar_generation_button_enabled:
      config?.sidebar_generation_button_enabled ??
      legacyConfig?.sidebar_generation_button_enabled ??
      DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
    background_image_enabled:
      config?.background_image_enabled ??
      legacyConfig?.background_image_enabled ??
      DEFAULT_BACKGROUND_IMAGE_ENABLED,
    background_image_path: null,
  };

  if (!legacyConfig?.background_image_data_url) {
    return withBackgroundImageUrl(supabase, config ?? baseConfig);
  }

  const legacyImage = legacyDataUrlParts(legacyConfig.background_image_data_url);
  if (!legacyImage) {
    return withBackgroundImageUrl(supabase, config ?? baseConfig);
  }

  const path = `backgrounds/legacy-background-${Date.now()}.${legacyImage.extension}`;
  const { error: uploadError } = await supabase.storage
    .from(INTERFACE_ASSETS_BUCKET)
    .upload(path, legacyImage.body, {
      contentType: legacyImage.contentType,
      upsert: false,
    });

  if (uploadError) {
    return withBackgroundImageUrl(supabase, config ?? baseConfig);
  }

  const migratedConfig = { ...baseConfig, background_image_path: path };
  await supabase
    .from("interface_config")
    .upsert({ id: true, ...migratedConfig, updated_at: new Date().toISOString() });

  await supabase
    .from("scheduler_config")
    .update({ background_image_data_url: null });

  return withBackgroundImageUrl(supabase, migratedConfig);
}
