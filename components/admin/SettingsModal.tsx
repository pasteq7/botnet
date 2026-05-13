"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, X, Loader, Check, ChevronDown } from "lucide-react";

interface AiConfig {
  id: string;
  provider: string;
  label: string;
  encrypted_key: string;
  default_model: string;
  fallback_model: string | null;
  purpose: string;
  is_active: boolean;
  created_at: string;
}

interface SchedulerConfig {
  default_interval_minutes: number;
  max_per_run: number;
}

interface ModelOption {
  id: string;
  label: string;
}

const PROVIDERS = ["gemini", "openai", "anthropic", "deepseek", "openrouter", "mistral"] as const;
const PURPOSES = ["any", "search", "generation"] as const;

const PURPOSE_META: Record<string, { label: string; hint: string; dot: string }> = {
  any: { label: "Any", hint: "Handles both web search and generation", dot: "bg-emerald-400" },
  search: { label: "Search", hint: "Web-search grounded content only", dot: "bg-blue-400" },
  generation: { label: "Generation", hint: "Pure text generation, no web search", dot: "bg-violet-400" },
};

const PURPOSE_CONFLICT: Record<string, string> = {
  any: "Activating this will deactivate any Search or Generation configs.",
  search: "Cannot activate while an Any config is active.",
  generation: "Cannot activate while an Any config is active.",
};

function getModeLabel(active: AiConfig[]): { text: string; ok: boolean } {
  const purposes = new Set(active.map((c) => c.purpose));
  if (active.length === 0) return { text: "No active config — generation disabled", ok: false };
  if (purposes.has("any")) return { text: "Single model · web search + generation", ok: true };
  if (purposes.has("search") && purposes.has("generation"))
    return { text: "Dual model · search + generation split", ok: true };
  if (purposes.has("search")) return { text: "Partial · search only configured", ok: false };
  if (purposes.has("generation")) return { text: "Partial · generation only configured", ok: false };
  return { text: "Unknown state", ok: false };
}

function PurposePill({ purpose }: { purpose: string }) {
  const m = PURPOSE_META[purpose] ?? { label: purpose, hint: "", dot: "bg-zinc-400" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted/80">
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted/90 tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";
const selectCls = inputCls;

function ConfigCard({
  config,
  onToggle,
  onEdit,
  onDelete,
}: {
  config: AiConfig;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 border-b border-border/40 last:border-b-0 transition-colors ${config.is_active ? "bg-surface hover:bg-surface-hover" : "bg-transparent hover:bg-surface-hover/50"
        }`}
    >
      <Toggle checked={config.is_active} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted/80 bg-surface-hover px-1.5 py-0.5 rounded">
            {config.provider}
          </span>
          <PurposePill purpose={config.purpose} />
        </div>
        <p className="text-xs text-muted/90 mt-0.5 font-mono truncate">
          {config.default_model}
          {config.fallback_model && <span className="text-muted/40"> · {config.fallback_model}</span>}
        </p>
      </div>

      <div
        className={`flex items-center gap-1 transition-opacity duration-150 ${confirmDel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
      >
        {confirmDel ? (
          <>
            <span className="text-xs text-muted/70 mr-1">Delete?</span>
            <button
              onClick={onDelete}
              className="px-2.5 py-1 text-xs font-medium text-white bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="px-2.5 py-1 text-xs font-medium text-muted border border-border/60 rounded-lg hover:bg-surface-hover transition-colors"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="px-2.5 py-1 text-xs font-medium text-muted/70 border border-transparent rounded-lg hover:border-border/60 hover:text-foreground/80 hover:bg-surface-hover transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="px-2.5 py-1 text-xs font-medium text-muted/70 border border-transparent rounded-lg hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  fetchedModels,
  fetchingModels,
  onFetchModels,
}: {
  initial?: Partial<AiConfig>;
  onSubmit: (data: Record<string, string | boolean | null>) => void;
  onCancel: () => void;
  submitting: boolean;
  fetchedModels: Record<string, ModelOption[]>;
  fetchingModels: boolean;
  onFetchModels: (key: string, provider: string, id?: string) => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    provider: initial?.provider ?? "gemini",
    label: initial?.label ?? "",
    api_key: initial?.encrypted_key ?? "",
    default_model: initial?.default_model ?? "",
    fallback_model: initial?.fallback_model ?? "",
    purpose: initial?.purpose ?? "any",
    is_active: initial?.is_active ?? false,
  });

  function set(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const models = (() => {
    const list = fetchedModels[form.provider] ?? [];
    const seen = new Set<string>();
    return list.filter((m) => {
      const d = seen.has(m.id);
      seen.add(m.id);
      return !d;
    });
  })();

  return (
    <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <span className="text-sm font-semibold text-foreground">
          {isEdit ? "Edit config" : "New config"}
        </span>
        <button
          onClick={onCancel}
          className="text-muted/50 hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...form, fallback_model: form.fallback_model || null });
        }}
        className="p-5 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          {!isEdit && (
            <Field label="Provider">
              <select
                value={form.provider}
                onChange={(e) => set("provider", e.target.value)}
                className={selectCls}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Label" hint="A nickname for this config">
            <input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Production"
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="API Key">
          <div className="flex gap-2">
            <input
              value={form.api_key}
              onChange={(e) => set("api_key", e.target.value)}
              type="password"
              placeholder={isEdit ? "Leave blank to keep current key" : "sk-…"}
              required={!isEdit}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onFetchModels(form.api_key, form.provider, initial?.id)}
              disabled={fetchingModels || (!form.api_key && !initial?.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {fetchingModels ? (
                <>
                  <Loader className="size-3.5 animate-spin" />
                  Loading
                </>
              ) : (
                "Fetch models"
              )}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Default model">
            <input
              value={form.default_model}
              onChange={(e) => set("default_model", e.target.value)}
              list="form-model-default"
              required
              placeholder="e.g. gemini-2.0-flash"
              className={inputCls}
            />
            <datalist id="form-model-default">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Fallback model" hint="Optional">
            <input
              value={form.fallback_model}
              onChange={(e) => set("fallback_model", e.target.value)}
              list="form-model-fallback"
              placeholder="e.g. gemini-2.0-flash-lite"
              className={inputCls}
            />
            <datalist id="form-model-fallback">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Purpose">
          <div className="grid grid-cols-3 gap-2">
            {PURPOSES.map((p) => {
              const m = PURPOSE_META[p];
              const active = form.purpose === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("purpose", p)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${active
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : "border-border/60 bg-transparent text-muted hover:border-border hover:bg-surface-hover"
                    }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                    <span
                      className={`size-1.5 rounded-full ${active ? m.dot : m.dot.replace("bg-", "bg-")}`}
                    />
                    {m.label}
                  </span>
                  <span
                    className={`text-xs leading-snug ${active ? "text-muted/90" : "text-muted/70"
                      }`}
                  >
                    {m.hint}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted/70 mt-1.5 leading-relaxed">
            {PURPOSE_CONFLICT[form.purpose]}
          </p>
        </Field>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Toggle
                checked={form.is_active}
                onChange={() => set("is_active", !form.is_active)}
              />
              <span className="text-xs text-muted/80">Activate immediately</span>
            </label>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader className="size-3.5 animate-spin" />
                  Saving
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add config"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Record<string, ModelOption[]>>({});
  const [fetchingModels, setFetchingModels] = useState(false);
  const [scheduler, setScheduler] = useState<SchedulerConfig>({
    default_interval_minutes: 60,
    max_per_run: 4,
  });
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [schedulerSaved, setSchedulerSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    fetchConfigs();
    fetchSchedulerConfig();
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  async function fetchConfigs() {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    if (res.ok) setConfigs(await res.json());
    setLoading(false);
  }

  async function fetchSchedulerConfig() {
    const res = await fetch("/api/admin/settings?section=scheduler");
    if (res.ok) setScheduler(await res.json());
  }

  async function handleFetchModels(apiKey: string, provider: string, configId?: string) {
    setFetchingModels(true);
    setError(null);
    const body: Record<string, string> = { provider };
    if (apiKey && !apiKey.startsWith("•")) body.api_key = apiKey;
    else if (configId) body.config_id = configId;
    else {
      setError("Enter a valid API key to fetch models");
      setFetchingModels(false);
      return;
    }

    const res = await fetch("/api/admin/settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setFetchedModels((p) => ({ ...p, [provider]: data.models }));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to fetch models");
    }
    setFetchingModels(false);
  }

  async function handleAdd(data: Record<string, string | boolean | null>) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowAdd(false);
      await fetchConfigs();
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to add config");
    }
    setSubmitting(false);
  }

  async function handleEdit(data: Record<string, string | boolean | null>) {
    if (!editingId) return;
    setSubmitting(true);
    setError(null);
    const body: Record<string, string | boolean | null> = { id: editingId, ...data };
    if (typeof body.api_key === "string" && body.api_key.startsWith("•")) delete body.api_key;
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditingId(null);
      await fetchConfigs();
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save changes");
    }
    setSubmitting(false);
  }

  async function handleToggle(config: AiConfig) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.id, is_active: !config.is_active }),
    });
    if (res.ok) {
      await fetchConfigs();
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to toggle");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/settings?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchConfigs();
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to delete");
    }
  }

  const activeConfigs = configs.filter((c) => c.is_active);
  const { text: modeText, ok: modeOk } = getModeLabel(activeConfigs);
  const editingConfig = configs.find((c) => c.id === editingId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full sm:max-w-2xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/60 overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col"
          >
            <div className="px-5 pt-4 pb-0 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Settings</h2>
                <p className="text-xs text-muted/80 mt-0.5">API keys and system configuration</p>
              </div>
              <button
                onClick={onClose}
                className="text-muted/50 hover:text-foreground transition-colors p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {error && (
                <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400/50 hover:text-red-400 leading-none mt-0.5"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">AI Configs</h3>
                    {!loading && (
                      <p className={`text-xs mt-0.5 ${modeOk ? "text-muted/70" : "text-amber-400/80"}`}>
                        {modeText}
                      </p>
                    )}
                  </div>
                  {!showAdd && !editingId && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
                    >
                      <Plus className="size-3.5" />
                      Add config
                    </button>
                  )}
                </div>

                {showAdd && (
                  <ConfigForm
                    onSubmit={handleAdd}
                    onCancel={() => setShowAdd(false)}
                    submitting={submitting}
                    fetchedModels={fetchedModels}
                    fetchingModels={fetchingModels}
                    onFetchModels={handleFetchModels}
                  />
                )}

                {editingId && editingConfig && (
                  <ConfigForm
                    initial={editingConfig}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingId(null)}
                    submitting={submitting}
                    fetchedModels={fetchedModels}
                    fetchingModels={fetchingModels}
                    onFetchModels={handleFetchModels}
                  />
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted/50">
                    <Loader className="size-5 animate-spin mr-2" />
                    Loading
                  </div>
                ) : configs.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
                    <p className="text-foreground/80 font-medium">No configs yet</p>
                    <p className="text-xs text-muted/80 mt-1 mb-5">
                      Add your first AI provider configuration to get started.
                    </p>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
                    >
                      Add config
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-surface divide-y divide-border/40">
                    {[...configs]
                      .sort((a, b) => Number(b.is_active) - Number(a.is_active))
                      .map((config) =>
                        !editingId || editingId !== config.id ? (
                          <div key={config.id} className="group">
                            <ConfigCard
                              config={config}
                              onToggle={() => handleToggle(config)}
                              onEdit={() => {
                                setEditingId(config.id);
                                setShowAdd(false);
                              }}
                              onDelete={() => handleDelete(config.id)}
                            />
                          </div>
                        ) : null
                      )}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <button
                  onClick={() => setSchedulerOpen((o) => !o)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Scheduler</h3>
                  <ChevronDown
                    className={`size-4 text-muted/50 transition-transform duration-200 ${schedulerOpen ? "rotate-0" : "-rotate-90"
                      }`}
                  />
                  {!schedulerOpen && (
                    <span className="text-xs text-muted/70 ml-1">
                      Every {scheduler.default_interval_minutes}min &middot; max {scheduler.max_per_run}/run
                    </span>
                  )}
                </button>

                {schedulerOpen && (
                  <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Default interval" hint="Fallback for communities without their own interval.">
                        <select
                          value={scheduler.default_interval_minutes}
                          onChange={(e) =>
                            setScheduler((s) => ({
                              ...s,
                              default_interval_minutes: parseInt(e.target.value) || 60,
                            }))
                          }
                          className={inputCls}
                        >
                          <option value={15}>Every 15 min</option>
                          <option value={30}>Every 30 min</option>
                          <option value={60}>Every hour</option>
                          <option value={120}>Every 2 hours</option>
                          <option value={240}>Every 4 hours</option>
                          <option value={720}>Every 12 hours</option>
                          <option value={1440}>Every 24 hours</option>
                        </select>
                      </Field>
                      <Field label="Max per tick" hint="Safety cap on parallel generations per cron tick.">
                        <input
                          type="number"
                          min={0}
                          value={scheduler.max_per_run}
                          onChange={(e) =>
                            setScheduler((s) => ({
                              ...s,
                              max_per_run: parseInt(e.target.value) || 0,
                            }))
                          }
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          setSchedulerSaving(true);
                          setSchedulerSaved(false);
                          const res = await fetch("/api/admin/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _section: "scheduler", ...scheduler }),
                          });
                          if (res.ok) {
                            setSchedulerSaved(true);
                            setTimeout(() => setSchedulerSaved(false), 2500);
                          } else setError("Failed to save scheduler config");
                          setSchedulerSaving(false);
                        }}
                        disabled={schedulerSaving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {schedulerSaved ? (
                          <>
                            <Check className="size-3.5" />
                            Saved
                          </>
                        ) : schedulerSaving ? (
                          <>
                            <Loader className="size-3.5 animate-spin" />
                            Saving
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
