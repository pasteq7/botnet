"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader, Pencil, Trash2, CheckCircle2, AlertTriangle, CircleOff,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { type AiConfig, type ModelOption, type SearchConfig, Toggle, ModelRoleBadge, modelCacheKey } from "./shared";
import ConfigForm from "./ConfigForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassSurface } from "@/components/ui/GlassSurface";

function getConflictingRoles(role: string) {
  if (role === "full") return ["full", "searcher", "generator"];
  if (role === "searcher") return ["full", "searcher"];
  return ["full", "generator"];
}

export default function ConfigSection({ onSwitchTab }: { onSwitchTab?: () => void }) {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingConfig, setEditing] = useState<AiConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedModels, setModels] = useState<Record<string, ModelOption[]>>({});
  const [fetchingModels, setFetching] = useState(false);
  const [searchConfigs, setSearchConfigs] = useState<SearchConfig[]>([]);
  const [pendingToggle, setPendingToggle] = useState<AiConfig | null>(null);
  const [showReadinessInfo, setShowReadinessInfo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const load = async () => {
    const [res, searchRes] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/admin/search-configs"),
    ]);
    if (res.ok) setConfigs(await res.json());
    if (searchRes.ok) setSearchConfigs(await searchRes.json());
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then(r => r.ok ? r.json() : []),
      fetch("/api/admin/search-configs").then(r => r.ok ? r.json() : []),
    ]).then(([configsData, searchData]) => {
      setConfigs(configsData);
      setSearchConfigs(searchData);
      setLoading(false);
    });
  }, []);

  function openAdd() { setEditing(null); setFormError(null); setView("form"); }
  function openEdit(c: AiConfig) { setEditing(c); setFormError(null); setView("form"); }
  function closeForm() { setView("list"); setEditing(null); setFormError(null); }

  async function handleSubmit(data: Record<string, string | boolean | null> | Record<string, string | boolean | null>[]) {
    setSubmitting(true);
    const items = Array.isArray(data) ? data : [data];
    let ok = true;

    for (const item of items) {
      const isEdit = !!editingConfig && items.length === 1;
      const url = "/api/admin/settings";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit ? { id: editingConfig!.id, ...item } : item;
      if (isEdit && (body.api_key === null || typeof body.api_key !== "string")) delete body.api_key;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) { const d = await res.json(); setFormError(d.error || "Failed to save"); ok = false; break; }
    }

    if (ok) { closeForm(); await load(); router.refresh(); }
    setSubmitting(false);
  }

  function getCasualties(config: AiConfig) {
    const conflictingRoles = getConflictingRoles(config.role);

    return configs.filter(
      (c) => c.is_active && c.id !== config.id && conflictingRoles.includes(c.role)
    );
  }

  function handleToggleClick(config: AiConfig) {
    if (!config.is_active) {
      const casualties = getCasualties(config);
      if (casualties.length > 0) {
        setPendingToggle(config);
        return;
      }
    }
    doToggle(config);
  }

  async function doToggle(config: AiConfig) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.id, is_active: !config.is_active }),
    });
    if (res.ok) { await load(); router.refresh(); setRowErrors(prev => { const n = { ...prev }; delete n[config.id]; return n; }); }
    else { const d = await res.json(); setRowErrors(prev => ({ ...prev, [config.id]: d.error || "Failed to toggle" })); }
  }

  function handleConfirmToggle() {
    if (!pendingToggle) return;
    const config = pendingToggle;
    setPendingToggle(null);
    doToggle(config);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/settings?id=${id}`, { method: "DELETE" });
    if (res.ok) { await load(); router.refresh(); setRowErrors(prev => { const n = { ...prev }; delete n[id]; return n; }); }
    else { const d = await res.json(); setRowErrors(prev => ({ ...prev, [id]: d.error || "Failed to delete" })); }
  }

  async function handleFetchModels(apiKey: string, provider: string, id?: string, baseUrl?: string) {
    setFetching(true);
    const body: Record<string, string> = { provider };
    if (apiKey && !apiKey.startsWith("•")) body.api_key = apiKey;
    else if (id) body.config_id = id;
    else if (provider !== "local") { setFormError("Enter a valid API key"); setFetching(false); return; }
    if (baseUrl) body.base_url = baseUrl;

    const res = await fetch("/api/admin/settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setModels(p => ({ ...p, [modelCacheKey(provider, baseUrl)]: d.models }));
    } else {
      const d = await res.json();
      setFormError(d.error || "Failed to fetch models");
    }
    setFetching(false);
  }

  const sorted = [...configs].sort((a, b) => Number(b.is_active) - Number(a.is_active));

  if (view === "form") {
    return (
      <ConfigForm
        initial={editingConfig ?? undefined}
        onSubmit={handleSubmit}
        onCancel={closeForm}
        submitting={submitting}
        fetchedModels={fetchedModels}
        fetchingModels={fetchingModels}
        onFetchModels={handleFetchModels}
        error={formError}
        onClearError={() => setFormError(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted uppercase tracking-wider font-semibold">
            {configs.filter(c => c.is_active).length} active
          </span>
          {!loading && configs.length > 0 && (
            <>
              <span className="text-xs text-muted/30">·</span>
              <GenerationReadiness
                configs={configs}
                searchConfigs={searchConfigs}
                expanded={showReadinessInfo}
                onToggle={() => setShowReadinessInfo(!showReadinessInfo)}
              />
            </>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Plus className="size-3.5" /> Add config
        </button>
      </div>

      {/* Generation readiness detail panel */}
      {showReadinessInfo && (
        <GenerationReadinessDetail
          configs={configs}
          searchConfigs={searchConfigs}
          onSwitchTab={onSwitchTab}
          onClose={() => setShowReadinessInfo(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-muted/50 border border-border/50 rounded-xl bg-surface/30">
          <Loader className="size-5 animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-surface/20">
          <p className="text-sm font-medium text-foreground">No configs yet</p>
          <p className="text-sm text-muted mt-1 mb-5 max-w-[280px] mx-auto leading-relaxed">
            Add a <strong className="text-foreground font-medium">Full</strong> config to get started.
          </p>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-surface border border-border/60 text-foreground rounded-lg text-sm font-medium hover:bg-surface-hover hover:border-border transition-all shadow-sm"
          >
            Add config
          </button>
        </div>
      ) : (
        <>
          <GlassSurface className="divide-y divide-border/60 overflow-hidden">
            {sorted.map(config => (
              <ConfigRow
                key={config.id}
                config={config}
                configs={configs}
                onToggle={() => handleToggleClick(config)}
                onEdit={() => openEdit(config)}
                onDelete={() => handleDelete(config.id)}
                error={rowErrors[config.id]}
              />
            ))}
          </GlassSurface>
        </>
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        title={pendingToggle ? `Activate "${pendingToggle.label}"?` : ""}
        message={
          pendingToggle
            ? `This will deactivate ${getCasualties(pendingToggle).map((c) => `"${c.label}"`).join(", ")}.`
            : ""
        }
        confirmLabel="Deactivate & activate"
        onConfirm={handleConfirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}

function ConfigRow({ config, configs, onToggle, onEdit, onDelete, error }: {
  config: AiConfig;
  configs: AiConfig[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  error?: string;
}) {
  const activeConfigs = configs.filter((c) => c.is_active && c.id !== config.id);

  const conflictingRoles = getConflictingRoles(config.role);

  const hasConflict = !config.is_active && activeConfigs.some((c) =>
    conflictingRoles.includes(c.role)
  );

  const conflictLabel =
    hasConflict
      ? activeConfigs
          .filter((c) => conflictingRoles.includes(c.role))
          .map((c) => c.label)
          .join(", ")
      : null;

  return (
    <div className={`transition-colors first:rounded-t-[11px] last:rounded-b-[11px]
      ${config.is_active ? "bg-surface" : "bg-transparent opacity-60"} hover:bg-surface-hover ${error ? "ring-1 ring-inset ring-red-500/30" : ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Toggle checked={config.is_active} onChange={onToggle} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{config.label}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border/40">
              {config.provider}
            </span>
            <ModelRoleBadge role={config.role} searchMode={config.search_mode} />
          </div>
          <p className="text-sm text-muted font-mono truncate mt-0.5">
            {config.default_model}
            {config.fallback_model && <span className="text-muted/40"> · {config.fallback_model}</span>}
          </p>
          {conflictLabel && (
            <p className="text-xs text-amber-400/70 mt-0.5">
              Enabling will deactivate {conflictLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <Pencil className="size-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {error && (
        <p className="px-4 pb-2.5 text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function GenerationReadiness({
  configs,
  searchConfigs,
  expanded,
  onToggle,
}: {
  configs: AiConfig[];
  searchConfigs: SearchConfig[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const active = configs.filter((c) => c.is_active);
  const hasActiveSearchProvider = searchConfigs.some((c) => c.is_active);

  const fullBuiltIn = active.find((c) => c.role === "full" && c.search_mode === "native");
  const fullExternal = active.find((c) => c.role === "full" && c.search_mode === "external");
  const searcherBuiltIn = active.find((c) => c.role === "searcher" && c.search_mode === "native");
  const searcherExternal = active.find((c) => c.role === "searcher" && c.search_mode === "external");
  const generator = active.find((c) => c.role === "generator");

  const case1 = !!fullBuiltIn;
  const case2 = !!fullExternal && hasActiveSearchProvider;
  const case3 = !!searcherBuiltIn && !!generator;
  const case4 = !!searcherExternal && hasActiveSearchProvider && !!generator;
  const case5 = !!generator && !searcherBuiltIn && !searcherExternal && !fullBuiltIn && !fullExternal;

  const isReady = case1 || case2 || case3 || case4 || case5;

  const hasAnyActive = active.length > 0;

  const hasWarning = !isReady && hasAnyActive;

  let dotColor = "bg-gray-400";
  let label = "";

  if (active.length === 0) {
    dotColor = "bg-gray-400";
    label = "Paused";
  } else if (isReady) {
    dotColor = "bg-emerald-400";
    label = "Ready";
  } else if (hasWarning) {
    dotColor = "bg-amber-400";
    label = "Incomplete";
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${expanded ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
    >
      <span className={`size-2 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
    </button>
  );
}

function GenerationReadinessDetail({
  configs,
  searchConfigs,
  onSwitchTab,
  onClose,
}: {
  configs: AiConfig[];
  searchConfigs: SearchConfig[];
  onSwitchTab?: () => void;
  onClose: () => void;
}) {
  const active = configs.filter((c) => c.is_active);
  const hasActiveSearchProvider = searchConfigs.some((c) => c.is_active);

  const fullBuiltIn = active.find((c) => c.role === "full" && c.search_mode === "native");
  const fullExternal = active.find((c) => c.role === "full" && c.search_mode === "external");
  const searcherBuiltIn = active.find((c) => c.role === "searcher" && c.search_mode === "native");
  const searcherExternal = active.find((c) => c.role === "searcher" && c.search_mode === "external");
  const generator = active.find((c) => c.role === "generator");

  const case1 = !!fullBuiltIn;
  const case2 = !!fullExternal && hasActiveSearchProvider;
  const case3 = !!searcherBuiltIn && !!generator;
  const case4 = !!searcherExternal && hasActiveSearchProvider && !!generator;
  const case5 = !!generator && !searcherBuiltIn && !searcherExternal && !fullBuiltIn && !fullExternal;

  const isReady = case1 || case2 || case3 || case4 || case5;

  const hasAnyActive = active.length > 0;
  const hasFull = !!fullBuiltIn || !!fullExternal;
  const hasSearcher = !!searcherBuiltIn || !!searcherExternal;
  const hasGenerator = !!generator;
  const hasExternalRole = !!fullExternal || !!searcherExternal;
  const needsSearchProvider = hasExternalRole && !hasActiveSearchProvider;
  const hasWarning = !isReady && hasAnyActive;

  let readyDetail = "";
  if (case1) readyDetail = fullBuiltIn!.default_model + " — built-in search";
  else if (case2) readyDetail = fullExternal!.default_model + " — external search";
  else if (case3) readyDetail = "Searcher + Generator — built-in search";
  else if (case4) readyDetail = "Searcher + Generator — external search";
  else if (case5) readyDetail = generator!.default_model + " — generator";

  let warningMessage = "";
  let showAddSearchLink = false;

  if (!hasAnyActive) {
    warningMessage = "No active configs — generation is paused";
  } else if (isReady) {
  } else if (hasFull && needsSearchProvider) {
    warningMessage = "Full config uses external search but no search API is active";
    showAddSearchLink = true;
  } else if (hasSearcher && hasGenerator && needsSearchProvider) {
    warningMessage = "Searcher uses external search but no search API is active";
    showAddSearchLink = true;
  } else if (hasSearcher && !hasGenerator) {
    warningMessage = "Searcher configured but no Generator — add a Generator or Full config";
  } else if (hasFull && needsSearchProvider) {
    warningMessage = "Full config requires an active external search API";
    showAddSearchLink = true;
  } else {
    warningMessage = "Generation setup incomplete — check your active model roles";
  }

  return (
    <GlassSurface className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted/60">Generation readiness</h4>
        <button onClick={onClose} className="text-xs text-muted/50 hover:text-muted transition-colors">
          close
        </button>
      </div>

      {!hasAnyActive && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <CircleOff className="size-4 shrink-0 text-gray-400" />
          <span>No active configs — generation is paused</span>
        </div>
      )}

      {isReady && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Generation ready — {readyDetail}</span>
        </div>
      )}

      {hasWarning && (
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{warningMessage}</span>
          {showAddSearchLink && (
            <>
              <span className="text-amber-400/50">—</span>
              <button
                onClick={onSwitchTab}
                className="underline underline-offset-2 hover:text-amber-200 transition-colors whitespace-nowrap"
              >
                add one
              </button>
            </>
          )}
        </div>
      )}

      {/* Active configs checklist */}
      <div className="pt-1 space-y-1">
        <h5 className="text-xs font-semibold text-muted/50 uppercase tracking-wider">Active configs</h5>
        {active.length === 0 ? (
          <p className="text-xs text-muted/40 italic">None</p>
        ) : (
          <div className="space-y-1">
            {active.map((c) => {
              const what =
                c.role === "generator" ? "Writes content" :
                  c.role === "searcher" ? "Searches web" :
                    c.search_mode === "none" ? "Writes content" :
                      "Searches + writes";
              const how =
                c.search_mode === "native" ? "built-in search" :
                  c.search_mode === "external" ? "external search" : "";
              return (
                <div key={c.id} className="flex items-center gap-2 text-xs text-muted">
                  <CheckCircle2 className="size-3 shrink-0 text-emerald-400/70" />
                  <span className="font-medium text-foreground/80">{c.label}</span>
                  <span className="text-muted/30">—</span>
                  <span>{what}{how ? ` • ${how}` : ""}</span>
                  <span className="text-muted/30">·</span>
                  <span className="font-mono text-muted/60">{c.default_model}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search provider check */}
      <div className="pt-1 space-y-1">
        <h5 className="text-xs font-semibold text-muted/50 uppercase tracking-wider">External search API</h5>
        <div className="flex items-center gap-2 text-xs">
          {hasActiveSearchProvider ? (
            <>
              <CheckCircle2 className="size-3 shrink-0 text-emerald-400/70" />
              <span className="text-muted">Active</span>
            </>
          ) : (
            <>
              <CircleOff className="size-3 shrink-0 text-gray-400" />
              <span className="text-muted/60">None configured</span>
              {onSwitchTab && (
                <>
                  <span className="text-muted/30">—</span>
                  <button onClick={onSwitchTab} className="underline underline-offset-2 text-muted/50 hover:text-muted transition-colors">
                    configure
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </GlassSurface>
  );
}
