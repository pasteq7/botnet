// components/admin/settings/SchedulerSection.tsx
"use client";
import { useState, useEffect } from "react";
import { Check, Loader, Save } from "lucide-react";
import { type SchedulerConfig, Field, inputCls } from "./shared";
import {
  COMMUNITY_CRON_INTERVAL_MINUTES,
  DEFAULT_MAX_COMMENTS_PER_THREAD,
  DEFAULT_MAX_THREADS_PER_TICK,
  DEFAULT_MIN_COMMENTS_PER_THREAD,
  DEFAULT_POSTING_INTERVAL_MINUTES,
  MAX_COMMENTS_PER_THREAD,
  MAX_THREADS_PER_TICK,
} from "@/lib/constants";

function clampNumber(value: string, min: number, max: number) {
  return Math.min(Math.max(parseInt(value, 10) || min, min), max);
}

export default function SchedulerSection({ onError }: { onError?: (msg: string) => void }) {
  const [config, setConfig] = useState<SchedulerConfig>({
    default_interval_minutes: DEFAULT_POSTING_INTERVAL_MINUTES,
    max_per_run: DEFAULT_MAX_THREADS_PER_TICK,
    default_min_comments_per_thread: DEFAULT_MIN_COMMENTS_PER_THREAD,
    default_max_comments_per_thread: DEFAULT_MAX_COMMENTS_PER_THREAD,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?section=scheduler")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setConfig((current) => ({
        ...current,
        ...d,
      })));
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
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Run limit</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max threads per tick" tooltip={`Cron runs every ${COMMUNITY_CRON_INTERVAL_MINUTES} minutes`}>
            <input
              type="number"
              min={0}
              max={MAX_THREADS_PER_TICK}
              value={config.max_per_run}
              onChange={e => setConfig(s => ({
                ...s,
                max_per_run: clampNumber(e.target.value, 0, MAX_THREADS_PER_TICK),
              }))}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Default comments</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum">
            <input
              type="number"
              min={0}
              max={MAX_COMMENTS_PER_THREAD}
              value={config.default_min_comments_per_thread}
              onChange={e => setConfig(s => {
                const min = clampNumber(e.target.value, 0, MAX_COMMENTS_PER_THREAD);
                return {
                  ...s,
                  default_min_comments_per_thread: min,
                  default_max_comments_per_thread: Math.max(min, s.default_max_comments_per_thread),
                };
              })}
              className={inputCls}
            />
          </Field>

          <Field label="Maximum">
            <input
              type="number"
              min={0}
              max={MAX_COMMENTS_PER_THREAD}
              value={config.default_max_comments_per_thread}
              onChange={e => setConfig(s => {
                const max = clampNumber(e.target.value, 0, MAX_COMMENTS_PER_THREAD);
                return {
                  ...s,
                  default_min_comments_per_thread: Math.min(s.default_min_comments_per_thread, max),
                  default_max_comments_per_thread: max,
                };
              })}
              className={inputCls}
            />
          </Field>
        </div>

        <p className="text-sm text-muted/70">
          Communities without overrides use {config.default_min_comments_per_thread}-{config.default_max_comments_per_thread}.
        </p>
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
