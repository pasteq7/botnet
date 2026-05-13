// components/admin/CommunityModal/ContentWeightsPanel.tsx
"use client";

import { useState, useMemo } from "react";
import {
  LayoutGrid, Newspaper, MessageCircle, BookOpen, Ban,
  Globe, Sliders, ChevronRight, HelpCircle, Lightbulb,
} from "lucide-react";
import type { ContentMode } from "@/types";
import { WeightStepper } from "./WeightStepper";
import {
  ALL_MODES, MODE_DESCRIPTIONS,
  REQUIRES_SEARCH_MODES, PRESETS, type Preset,
} from "./types";

// ── Icon resolver ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid, Newspaper, MessageCircle, BookOpen, Ban, Globe, Sliders,
  HelpCircle, Lightbulb,
};

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon className={className} /> : null;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  news: "bg-blue-500",
  "web-search": "bg-violet-500",
  discussion: "bg-pink-500",
  tips: "bg-emerald-500",
  ask: "bg-orange-500",
};
const FALLBACK = ["bg-cyan-500", "bg-rose-500", "bg-lime-500", "bg-fuchsia-500"];
const getColor = (mode: string, i: number) => MODE_COLORS[mode] ?? FALLBACK[i % FALLBACK.length];

// Enabled modes pill summary for each preset
function presetSummary(preset: Preset): string {
  const on = ALL_MODES.filter((m) => (preset.apply[m] ?? 0) > 0);
  if (on.length === 0) return "All disabled";
  if (on.length === ALL_MODES.length) return "All types enabled";
  return on.map((m) => m.replace("-", " ")).join(", ");
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContentWeightsPanel({
  weights,
  onChange,
}: {
  weights: Record<string, number>;
  onChange: (mode: ContentMode, val: number) => void;
}) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const totalWeight = useMemo(
    () => Object.values(weights).reduce((a, b) => a + b, 0),
    [weights],
  );
  const hasAnyEnabled = totalWeight > 0;

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    for (const [m, val] of Object.entries(preset.apply)) {
      onChange(m as ContentMode, val);
    }
  };

  // Detect if current weights match a preset
  const activePresetId = useMemo(() => {
    return (
      PRESETS.find((p) =>
        ALL_MODES.every((m) => (p.apply[m] ?? 0) === (weights[m] ?? 0))
      )?.id ?? null
    );
  }, [weights]);

  return (
    <div className="space-y-4">

      {/* ── Header + mode switcher ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Content Weights</h3>
          <p className="text-xs text-muted/80 mt-0.5">
            {mode === "simple"
              ? "Pick a preset that matches your community's purpose."
              : "Fine-tune how often each content type is generated."}
          </p>
        </div>

        {/* Simple / Advanced pill toggle */}
        <div className="flex shrink-0 items-center rounded-lg border border-border/30 bg-background/50 p-0.5 text-xs font-medium">
          {(["simple", "advanced"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md capitalize transition-all ${mode === m
                ? "bg-accent text-white shadow-sm"
                : "text-muted/60 hover:text-foreground/80"
                }`}
            >
              {m === "advanced" ? <Sliders className="size-3 inline mr-1 -mt-px" /> : null}
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SIMPLE MODE — preset radio list
      ════════════════════════════════════════════════════════════════ */}
      {mode === "simple" && (
        <div className="space-y-2">
          {PRESETS.map((preset) => {
            const isActive = (activePresetId ?? selectedPreset) === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${isActive
                  ? "border-accent/50 bg-accent/8 ring-1 ring-accent/20"
                  : "border-border/30 bg-background/40 hover:border-border/50 hover:bg-background/70"
                  }`}
              >
                {/* Radio dot */}
                <span
                  className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isActive ? "border-accent" : "border-border/50"
                    }`}
                >
                  {isActive && <span className="size-2 rounded-full bg-accent" />}
                </span>

                {/* Icon */}
                <span
                  className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-accent/15 text-accent" : "bg-border/10 text-muted/50"
                    }`}
                >
                  <DynIcon name={preset.icon} className="size-3.5" />
                </span>

                {/* Text */}
                <span className="flex-1 min-w-0">
                  <span className={`block text-xs font-bold ${isActive ? "text-foreground" : "text-foreground/90"}`}>
                    {preset.label}
                  </span>
                  <span className="block text-xs text-muted/70 mt-0.5">{preset.description}</span>
                  <span className="block text-xs text-muted/60 mt-1 font-mono truncate">
                    {presetSummary(preset)}
                  </span>
                </span>

                <ChevronRight
                  className={`size-3.5 shrink-0 transition-opacity ${isActive ? "opacity-40 text-accent" : "opacity-0"}`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ADVANCED MODE — distribution bar + presets + steppers
      ════════════════════════════════════════════════════════════════ */}
      {mode === "advanced" && (
        <div className="space-y-4">

          {/* Preset quick-pick strip */}
          <div>
            <p className="text-xs font-semibold text-muted/70 uppercase tracking-wider mb-1.5">
              Start from a preset
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${isActive
                        ? "border-accent/50 bg-accent/10 text-accent shadow-sm"
                        : "border-border/30 bg-background/50 text-foreground/70 hover:border-border/50 hover:bg-background/70"
                      }`}
                    title={preset.description}
                  >
                    <DynIcon name={preset.icon} className="size-3" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted/80">
              Total weight:{" "}
              <span className="font-mono text-foreground">{totalWeight.toFixed(1)}</span>
            </span>
            {!hasAnyEnabled && (
              <span className="text-xs text-red-400 font-medium">
                ⚠ Enable at least one type
              </span>
            )}
          </div>

          {/* Distribution bar */}
          {hasAnyEnabled ? (
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/20">
              {ALL_MODES.map((m, i) => {
                const pct = ((weights[m] || 0) / totalWeight) * 100;
                return (
                  <div
                    key={m}
                    className={`${getColor(m, i)} h-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                    title={`${m}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-2 w-full rounded-full bg-border/10" />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ALL_MODES.map((m, i) => {
              const pct = hasAnyEnabled
                ? Math.round(((weights[m] || 0) / totalWeight) * 100)
                : 0;
              return (
                <div key={m} className="flex items-center gap-1">
                  <span
                    className={`size-2 rounded-full ${getColor(m, i)} ${!hasAnyEnabled || (weights[m] || 0) === 0 ? "grayscale opacity-40" : ""
                      }`}
                  />
                  <span className="text-xs text-muted/80 capitalize">{m.replace("-", " ")}</span>
                  <span className="text-xs font-mono text-accent">{pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/10" />

          {/* Stepper groups */}
          <div>
            <p className="text-xs font-semibold text-muted/60 uppercase tracking-wider mb-1">
              Requires web search
            </p>
            <div className="divide-y divide-border/10">
              {ALL_MODES.filter((m) => REQUIRES_SEARCH_MODES.includes(m)).map((m, i) => (
                <WeightStepper
                  key={m}
                  mode={m}
                  color={getColor(m, i)}
                  description={MODE_DESCRIPTIONS[m]}
                  value={weights[m] || 0}
                  requiresSearch
                  onChange={(val) => onChange(m as ContentMode, val)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-border/10" />

          <div>
            <p className="text-xs font-semibold text-muted/60 uppercase tracking-wider mb-1">
              Generated content
            </p>
            <div className="divide-y divide-border/10">
              {ALL_MODES.filter((m) => !REQUIRES_SEARCH_MODES.includes(m)).map((m, i) => (
                <WeightStepper
                  key={m}
                  mode={m}
                  color={getColor(m, i + REQUIRES_SEARCH_MODES.length)}
                  description={MODE_DESCRIPTIONS[m]}
                  value={weights[m] || 0}
                  onChange={(val) => onChange(m as ContentMode, val)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}