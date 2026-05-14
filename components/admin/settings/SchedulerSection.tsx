// components/admin/settings/SchedulerSection.tsx
"use client";
import { useState, useEffect } from "react";
import { Check, Loader } from "lucide-react";
import { type SchedulerConfig, Field, inputCls } from "./shared";

export default function SchedulerSection({ onError }: { onError?: (msg: string) => void }) {
  const [config, setConfig] = useState<SchedulerConfig>({ default_interval_minutes: 60, max_per_run: 4 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?section=scheduler")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setConfig(d));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _section: "scheduler", ...config }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else onError?.("Failed to save scheduler config");
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted">
        Controls how often communities are refreshed and how many run in parallel per tick.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Default interval" hint="Fallback for communities without a custom interval.">
          <select
            value={config.default_interval_minutes}
            onChange={e => setConfig(s => ({ ...s, default_interval_minutes: parseInt(e.target.value) || 60 }))}
            className={inputCls}
          >
            {[15, 30, 60, 120, 240, 720, 1440].map(v => (
              <option key={v} value={v}>
                {v < 60 ? `Every ${v} min` : v === 60 ? "Every hour" : `Every ${v / 60} hours`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Max per tick" hint="Safety cap on parallel generations per cron tick.">
          <input
            type="number"
            min={0}
            value={config.max_per_run}
            onChange={e => setConfig(s => ({ ...s, max_per_run: parseInt(e.target.value) || 0 }))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saved
            ? <><Check className="size-3.5" /> Saved</>
            : saving
              ? <><Loader className="size-3.5 animate-spin" /> Saving</>
              : "Save changes"
          }
        </button>
      </div>
    </div>
  );
}