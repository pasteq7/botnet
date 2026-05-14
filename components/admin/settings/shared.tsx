"use client";

import type { SearchProviderId } from "@/types";

// ── Types ──

export interface AiConfig {
  id: string;
  provider: string;
  label: string;
  encrypted_key: string;
  default_model: string;
  fallback_model: string | null;
  role: string;
  search_mode: string;
  is_active: boolean;
  created_at: string;
  base_url?: string | null;
}

export interface SearchConfig {
  id: string;
  provider: string;
  label: string;
  encrypted_key: string;
  is_active: boolean;
  created_at: string;
}

export interface SchedulerConfig {
  default_interval_minutes: number;
  max_per_run: number;
}

export interface ModelOption {
  id: string;
  label: string;
}

// ── Constants ──

export const PROVIDERS = ["gemini", "openai", "anthropic", "deepseek", "openrouter", "mistral", "local"] as const;

export const SEARCH_PROVIDERS: { id: SearchProviderId; label: string; hint: string }[] = [
  { id: "tavily", label: "Tavily", hint: "Built for AI agents, clean structured results" },
  { id: "brave", label: "Brave Search", hint: "Affordable, no rate-limit surprises" },
  { id: "serper", label: "Serper", hint: "Google results via API, cheap" },
  { id: "exa", label: "Exa", hint: "Semantic search, good for niche topics" },
  { id: "google_pse", label: "Google PSE", hint: "Free tier, requires GOOGLE_PSE_CX env var" },
  { id: "none", label: "None", hint: "Disable search provider" },
];

export const ROLE_META: Record<string, { label: string; hint: string; dot: string }> = {
  full: { label: "Full", hint: "Handles search + generation", dot: "bg-emerald-400" },
  searcher: { label: "Searcher", hint: "Web search only", dot: "bg-blue-400" },
  generator: { label: "Generator", hint: "Generation only, no search", dot: "bg-violet-400" },
};

export const SEARCH_MODE_META: Record<string, { label: string; hint: string }> = {
  native: { label: "Built-in", hint: "Uses this provider's native search" },
  external: { label: "External API", hint: "Tavily, Brave, etc." },
  none: { label: "None", hint: "Discussion/tips only" },
};

// ── UI Primitives ──

export const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";
export const selectCls = inputCls;

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${
        checked ? "bg-accent/80" : "bg-border/60"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted/90 tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function RolePill({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, hint: "", dot: "bg-zinc-400" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted/80">
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function SearchModePill({ searchMode }: { searchMode: string }) {
  const colors: Record<string, string> = {
    native: "text-sky-400",
    external: "text-amber-400",
    none: "text-muted/50",
  };
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wider ${
        colors[searchMode] ?? "text-muted/50"
      }`}
    >
      {searchMode === "native_with_fallback" ? "native+fallback" : searchMode}
    </span>
  );
}
