"use client";

import { useEffect, useState } from "react";
import { Check, Loader, Save } from "lucide-react";
import { type InterfaceConfig, Toggle } from "./shared";
import { DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED } from "@/lib/constants";

export default function InterfaceSection({ onError }: { onError?: (msg: string) => void }) {
  const [config, setConfig] = useState<InterfaceConfig>({
    sidebar_generation_button_enabled: DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?section=interface")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConfig((current) => ({ ...current, ...d })));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _section: "interface", ...config }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      onError?.("Failed to save interface settings");
    }
    setSaving(false);
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
