// components/admin/settings/SchedulerSection.tsx
"use client";
import { useState, useEffect } from "react";
import { Check, Loader } from "lucide-react";
import { type SchedulerConfig, Field, inputCls } from "./shared";
import { DEFAULT_MAX_THREADS_PER_TICK, DEFAULT_POSTING_INTERVAL_MINUTES, MAX_THREADS_PER_TICK } from "@/lib/constants";

export default function SchedulerSection({ onError }: { onError?: (msg: string) => void }) {
  const [config, setConfig] = useState<SchedulerConfig>({
    default_interval_minutes: DEFAULT_POSTING_INTERVAL_MINUTES,
    max_per_run: DEFAULT_MAX_THREADS_PER_TICK,
    is_active: true,
  });
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

      <div className="grid grid-cols-2 gap-4">

        <Field label="Max Threads per Tick" hint="The automation cron job runs every 30 minutes.">
          <input
            type="number"
            min={0}
            max={MAX_THREADS_PER_TICK}
            value={config.max_per_run}
            onChange={e => setConfig(s => ({
              ...s,
              max_per_run: Math.min(Math.max(parseInt(e.target.value) || 0, 0), MAX_THREADS_PER_TICK),
            }))}
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
