// components\admin\settings\SearchConfigSection.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader, ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { type SearchConfig, SEARCH_PROVIDERS, Toggle, inputCls } from "./shared";
import { GlassSurface } from "@/components/ui/GlassSurface";

function SearchConfigRow({
  config,
  onToggle,
  onEdit,
  onDelete,
}: {
  config: SearchConfig;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const providerMeta = SEARCH_PROVIDERS.find((p) => p.id === config.provider);

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 transition-colors first:rounded-t-[11px] last:rounded-b-[11px] ${config.is_active ? "bg-surface" : "bg-transparent opacity-60"
        } hover:bg-surface-hover`}
    >
      <Toggle checked={config.is_active} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{config.label}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border/40">
            {providerMeta?.label ?? config.provider}
          </span>
        </div>
        {providerMeta && <p className="text-sm text-muted mt-0.5 leading-relaxed">{providerMeta.hint}</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          title="Edit"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SearchConfigForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<SearchConfig>;
  onSubmit: (data: Record<string, string | boolean | null>) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const isEdit = !!initial?.id;
  const [provider, setProvider] = useState(initial?.provider ?? "tavily");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [apiKey, setApiKey] = useState(initial?.encrypted_key ?? "");
  const [activate, setActivate] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, string | boolean | null> = {
      provider,
      label,
      api_key: (apiKey && !apiKey.startsWith("\u2022")) ? apiKey : null,
      is_active: isEdit ? (initial?.is_active ?? false) : activate,
    };
    onSubmit(data);
  }

  const needsApiKey = provider !== "none";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors -ml-1.5"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {isEdit ? "Edit search provider" : "Add search provider"}
        </h3>
      </div>

      <div className="bg-surface/50 border border-border/60 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-muted/90 tracking-tight">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={inputCls}
            >
              {SEARCH_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-muted/90 tracking-tight">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Production search"
              required
              className={inputCls}
            />
          </div>
        </div>

        {needsApiKey && (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-muted/90 tracking-tight">API Key</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder={isEdit ? "Leave blank to keep current key" : "sk-\u2026"}
              className={inputCls}
            />
            {provider === "google_pse" && (
              <p className="text-sm text-amber-500/90 font-medium mt-1">Requires GOOGLE_PSE_CX environment variable to be set.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        {!isEdit && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Toggle checked={activate} onChange={() => setActivate(!activate)} />
            <span className="text-sm text-muted">Activate immediately</span>
          </label>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted bg-transparent border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (!isEdit && needsApiKey && !apiKey)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <><Loader className="size-3.5 animate-spin" /> Saving</>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Save provider"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function SearchConfigSection({ onError }: { onError?: (msg: string) => void }) {
  const [configs, setConfigs] = useState<SearchConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingConfig, setEditingConfig] = useState<SearchConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/admin/search-configs");
    if (res.ok) setConfigs(await res.json());
  }

  useEffect(() => {
    fetch("/api/admin/search-configs")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setConfigs(d);
        setLoading(false);
      });
  }, []);

  function openAdd() {
    setEditingConfig(null);
    onError?.("");
    setView("form");
  }

  function openEdit(c: SearchConfig) {
    setEditingConfig(c);
    onError?.("");
    setView("form");
  }

  function closeForm() {
    setView("list");
    setEditingConfig(null);
  }

  async function handleSubmit(data: Record<string, string | boolean | null>) {
    setSubmitting(true);
    const isEdit = !!editingConfig;
    const url = "/api/admin/search-configs";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: editingConfig!.id, ...data } : data;
    if (isEdit && (body.api_key === null || typeof body.api_key !== "string")) delete body.api_key;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      closeForm();
      await load();
      router.refresh();
    } else {
      const d = await res.json();
      onError?.(d.error || "Failed to save provider configuration");
    }
    setSubmitting(false);
  }

  async function handleToggle(config: SearchConfig) {
    const res = await fetch("/api/admin/search-configs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.id, is_active: !config.is_active }),
    });
    if (res.ok) {
      await load();
      router.refresh();
    } else {
      const d = await res.json();
      onError?.(d.error || "Failed to toggle status");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/search-configs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      router.refresh();
    } else {
      const d = await res.json();
      onError?.(d.error || "Failed to delete provider");
    }
  }

  const activeCount = configs.filter((c) => c.is_active).length;
  const sorted = [...configs].sort((a, b) => Number(b.is_active) - Number(a.is_active));

  if (view === "form") {
    return (
      <SearchConfigForm
        initial={editingConfig ?? undefined}
        onSubmit={handleSubmit}
        onCancel={closeForm}
        submitting={submitting}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted uppercase tracking-wider font-semibold">
          {activeCount} active provider{activeCount !== 1 && "s"}
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Plus className="size-3.5" /> Add provider
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted/50 border border-border/50 rounded-xl bg-surface/30">
          <Loader className="size-5 animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/80 rounded-xl bg-surface/20">
          <div className="bg-surface size-10 rounded-full flex items-center justify-center mx-auto mb-3 border border-border/50">
            <Plus className="size-5 text-muted" />
          </div>
          <p className="text-sm font-medium text-foreground">No search providers</p>
          <p className="text-sm text-muted mt-1 mb-5 max-w-[240px] mx-auto leading-relaxed">
            Add a search API key to enable web search capabilities for your agents.
          </p>
        </div>
      ) : (
        <GlassSurface className="divide-y divide-border/60 overflow-hidden">
          {sorted.map((config) => (
            <SearchConfigRow
              key={config.id}
              config={config}
              onToggle={() => handleToggle(config)}
              onEdit={() => openEdit(config)}
              onDelete={() => handleDelete(config.id)}
            />
          ))}
        </GlassSurface>
      )}
    </div>
  );
}
