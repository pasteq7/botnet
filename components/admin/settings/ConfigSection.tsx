// components\admin\settings\ConfigSection.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader, MoreHorizontal } from "lucide-react";
import { type AiConfig, type ModelOption, Toggle, RolePill, SearchModePill } from "./shared";
import ConfigForm from "./ConfigForm";

export default function ConfigSection({ onError }: { onError?: (msg: string) => void }) {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingConfig, setEditing] = useState<AiConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedModels, setModels] = useState<Record<string, ModelOption[]>>({});
  const [fetchingModels, setFetching] = useState(false);
  const router = useRouter();

  const load = async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setConfigs(await res.json());
  };

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setConfigs(d); setLoading(false); });
  }, []);

  function openAdd() {
    setEditing(null);
    onError?.("");
    setView("form");
  }

  function openEdit(c: AiConfig) {
    setEditing(c);
    onError?.("");
    setView("form");
  }

  function closeForm() {
    setView("list");
    setEditing(null);
  }

  async function handleSubmit(data: Record<string, string | boolean | null>) {
    setSubmitting(true);
    const isEdit = !!editingConfig;
    const url = "/api/admin/settings";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: editingConfig!.id, ...data } : data;
    if (isEdit && (body.api_key === null || typeof body.api_key !== "string")) delete body.api_key;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) { closeForm(); await load(); router.refresh(); }
    else { const d = await res.json(); onError?.(d.error || "Failed to save"); }
    setSubmitting(false);
  }

  async function handleToggle(config: AiConfig) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.id, is_active: !config.is_active }),
    });
    if (res.ok) { await load(); router.refresh(); }
    else { const d = await res.json(); onError?.(d.error || "Failed to toggle"); }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/settings?id=${id}`, { method: "DELETE" });
    if (res.ok) { await load(); router.refresh(); }
    else { const d = await res.json(); onError?.(d.error || "Failed to delete"); }
  }

  async function handleFetchModels(apiKey: string, provider: string, id?: string, baseUrl?: string) {
    setFetching(true);
    const body: Record<string, string> = { provider };
    if (apiKey && !apiKey.startsWith("•")) body.api_key = apiKey;
    else if (id) body.config_id = id;
    else { onError?.("Enter a valid API key"); setFetching(false); return; }
    if (baseUrl) body.base_url = baseUrl;

    const res = await fetch("/api/admin/settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setModels(p => ({ ...p, [provider]: d.models }));
    } else {
      const d = await res.json();
      onError?.(d.error || "Failed to fetch models");
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
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider font-semibold">
          {configs.filter(c => c.is_active).length} active
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Plus className="size-3.5" /> Add config
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted/50 border border-border/50 rounded-xl bg-surface/30">
          <Loader className="size-5 animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="rounded-xl border border-border/80 divide-y divide-border/60 shadow-sm">
          {sorted.map(config => (
            <ConfigRow
              key={config.id}
              config={config}
              onToggle={() => handleToggle(config)}
              onEdit={() => openEdit(config)}
              onDelete={() => handleDelete(config.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ config, onToggle, onEdit, onDelete }: {
  config: AiConfig;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-[11px] last:rounded-b-[11px]
      ${config.is_active ? "bg-surface" : "bg-transparent opacity-60"}
      hover:bg-surface-hover`}
    >
      <Toggle checked={config.is_active} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{config.label}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-surface-hover px-1.5 py-0.5 rounded">
            {config.provider}
          </span>
          <RolePill role={config.role} />
          <SearchModePill searchMode={config.search_mode} />
        </div>
        <p className="text-xs text-muted font-mono truncate mt-0.5">
          {config.default_model}
          {config.fallback_model && <span className="text-muted/40"> · {config.fallback_model}</span>}
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(o => !o);
          }}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
            <div className="absolute right-0 top-8 z-20 w-32 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-border/80 rounded-xl bg-surface/20">
      <div className="bg-surface size-10 rounded-full flex items-center justify-center mx-auto mb-3 border border-border/50">
        <Plus className="size-5 text-muted" />
      </div>
      <p className="text-sm font-medium text-foreground">No configs yet</p>
      <p className="text-xs text-muted mt-1 mb-5 max-w-[200px] mx-auto leading-relaxed">
        Add your first AI provider to get started.
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-surface border border-border/60 text-foreground rounded-lg text-sm font-medium hover:bg-surface-hover hover:border-border transition-all shadow-sm"
      >
        Add config
      </button>
    </div>
  );
}