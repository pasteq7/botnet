"use client";

import { useEffect, useState } from "react";
import { Check, Loader, Save, Trash2, Upload } from "lucide-react";
import { type InterfaceConfig, Toggle } from "./shared";
import {
  ALLOWED_BACKGROUND_IMAGE_TYPES,
  DEFAULT_BACKGROUND_IMAGE_ENABLED,
  DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
  MAX_BACKGROUND_IMAGE_BYTES,
} from "@/lib/constants";
import { useTheme } from "@/components/theme/ThemeProvider";

const maxBackgroundImageKb = Math.round(MAX_BACKGROUND_IMAGE_BYTES / 1024);

function applyBackgroundPreview(config: InterfaceConfig) {
  if (config.background_image_url) {
    document.body.style.setProperty("--app-background-image", `url(${config.background_image_url})`);
  } else {
    document.body.style.removeProperty("--app-background-image");
  }
}

export default function InterfaceSection({ onError }: { onError?: (msg: string) => void }) {
  const { theme } = useTheme();
  const [config, setConfig] = useState<InterfaceConfig>({
    sidebar_generation_button_enabled: DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
    background_image_enabled: DEFAULT_BACKGROUND_IMAGE_ENABLED,
    background_image_path: null,
    background_image_url: null,
  });
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useDefaultBackground, setUseDefaultBackground] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const defaultBackgroundSrc = theme === "latte" ? "/light-bg-img.webp" : "/dark-bg-img.webp";
  const backgroundPreviewSrc = previewUrl || config.background_image_url || defaultBackgroundSrc;

  useEffect(() => {
    fetch("/api/admin/settings?section=interface")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConfig((current) => ({ ...current, ...d })));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSave() {
    setSaving(true);
    const formData = new FormData();
    formData.set("_section", "interface");
    formData.set("sidebar_generation_button_enabled", String(config.sidebar_generation_button_enabled));
    formData.set("background_image_enabled", String(config.background_image_enabled));
    formData.set("use_default_background", String(useDefaultBackground));
    if (backgroundFile) formData.set("background_image", backgroundFile);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const savedConfig = await res.json();
      setConfig((current) => ({ ...current, ...savedConfig }));
      setBackgroundFile(null);
      setUseDefaultBackground(false);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      applyBackgroundPreview({ ...config, ...savedConfig });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const data = await res.json().catch(() => null);
      onError?.(data?.error || "Failed to save interface settings");
    }
    setSaving(false);
  }

  function handleBackgroundFile(file: File | undefined) {
    if (!file) return;

    if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(file.type as typeof ALLOWED_BACKGROUND_IMAGE_TYPES[number])) {
      onError?.("Background image must be a PNG, JPEG, or WebP file");
      return;
    }

    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      onError?.(`Background image must be ${maxBackgroundImageKb}KB or smaller`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return objectUrl;
    });
    setBackgroundFile(file);
    setUseDefaultBackground(false);
    setConfig((s) => ({ ...s, background_image_enabled: true }));
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Public sidebar</h2>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-surface px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Community generation buttons</p>
            <p className="mt-1 text-sm text-muted/70">
              Show logged-in admins a manual generate button beside each public community.
            </p>
          </div>
          <Toggle
            checked={config.sidebar_generation_button_enabled}
            onChange={() => setConfig((s) => ({
              ...s,
              sidebar_generation_button_enabled: !s.sidebar_generation_button_enabled,
            }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Background</h2>
        <div className="space-y-4 rounded-lg border border-border/60 bg-surface px-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Background image</p>
              <p className="mt-1 text-sm text-muted/70">
                Use a small PNG, JPEG, or WebP. Visitors can show or hide it from the theme menu.
                Max {maxBackgroundImageKb}KB.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundPreviewSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center gap-2">
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                <Upload className="size-3.5" />
                Upload image
                <input
                  type="file"
                  accept={ALLOWED_BACKGROUND_IMAGE_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    handleBackgroundFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setBackgroundFile(null);
                  setUseDefaultBackground(true);
                  setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return null;
                  });
                  setConfig((s) => ({
                    ...s,
                    background_image_path: null,
                    background_image_url: null,
                  }));
                }}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                <Trash2 className="size-3.5" />
                Use default image
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saved
            ? <><Check className="size-3.5" /> Saved</>
            : saving
              ? <><Loader className="size-3.5 animate-spin" /> Saving</>
              : <><Save className="size-3.5" /> Save changes</>
          }
        </button>
      </div>
    </div>
  );
}
