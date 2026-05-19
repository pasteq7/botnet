"use client";

import type { SearchProviderId } from "@/types";
import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

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
  default_min_comments_per_thread: number;
  default_max_comments_per_thread: number;
  is_active: boolean;
}

export interface InterfaceConfig {
  sidebar_generation_button_enabled: boolean;
}

export interface ModelOption {
  id: string;
  label: string;
}

// ── Constants ──

export const PROVIDERS = ["gemini", "openai", "anthropic", "deepseek", "openrouter", "mistral", "local"] as const;

export const LOCAL_DEFAULT_BASE_URL = "http://localhost:11434/v1";

export function providerLabel(provider: string) {
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function modelCacheKey(provider: string, baseUrl?: string | null) {
  const normalizedBaseUrl = (baseUrl || "").trim().replace(/\/+$/, "");
  return provider === "local" ? `${provider}:${normalizedBaseUrl || LOCAL_DEFAULT_BASE_URL}` : provider;
}

export const SEARCH_PROVIDERS: { id: SearchProviderId; label: string; hint: string }[] = [
  { id: "tavily", label: "Tavily", hint: "Built for AI agents, clean structured results" },
  { id: "brave", label: "Brave", hint: "Affordable, no rate-limit surprises" },
  { id: "serper", label: "Serper", hint: "Google results via API, cheap" },
  { id: "exa", label: "Exa", hint: "Semantic search, good for niche topics" },
  { id: "google_pse", label: "Google PSE", hint: "Free tier, requires GOOGLE_PSE_CX env var" },
  { id: "none", label: "None", hint: "Disable search provider" },
];

export const ROLE_META: Record<string, { label: string; dot: string; hint: string }> = {
  full: { label: "Full", dot: "bg-emerald-400", hint: "Finds + writes content" },
  searcher: { label: "Searcher", dot: "bg-blue-400", hint: "Finds content → passes to Generator" },
  generator: { label: "Generator", dot: "bg-violet-400", hint: "Writes content ← needs a Searcher" },
};

export const SEARCH_MODE_META: Record<string, { label: string; hint: string }> = {
  native: { label: "Built-in", hint: "Uses this provider's native search" },
  external: { label: "External API", hint: "Tavily, Brave, etc." },
};

// ── UI Primitives ──

export const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${checked ? "bg-accent/80" : "bg-border/60"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"
          }`}
      />
    </button>
  );
}

export function Field({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="block text-sm font-semibold text-muted/90 tracking-tight">{label}</label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <Info className="size-3.5 text-muted/65 hover:text-foreground transition-colors cursor-help" />
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-sm text-muted/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function PipelineBadge({ role, searchMode }: { role: string; searchMode?: string }) {
  const searchLabel =
    searchMode === "external" ? "external API" :
      searchMode === "native_with_fallback" ? "native+fallback" :
        searchMode === "none" ? "no search" :
          "built-in";

  if (role === "generator") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300/80">
        <span className="size-1.5 rounded-full bg-violet-400" />
        Generator
      </span>
    );
  }
  if (role === "searcher") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-300/80">
        <span className="size-1.5 rounded-full bg-blue-400" />
        Searcher — {searchLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300/80">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      {searchMode === "none" ? "Generation only" : `Searches + generates — ${searchLabel}`}
    </span>
  );
}
