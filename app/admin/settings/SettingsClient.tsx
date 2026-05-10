"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AiConfig {
  id: string;
  provider: string;
  label: string;
  encrypted_key: string;
  default_model: string;
  fallback_model: string | null;
  is_active: boolean;
  created_at: string;
}

interface ModelOption {
  id: string;
  label: string;
}

const PROVIDERS = ["gemini", "openai", "anthropic", "deepseek", "groq", "openrouter", "together", "perplexity", "mistral"] as const;

export default function SettingsClient() {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<Record<string, ModelOption[]>>({});
  const [fetchingModels, setFetchingModels] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    provider: "gemini",
    label: "",
    api_key: "",
    default_model: "",
    fallback_model: "",
    is_active: false,
  });

  const [editForm, setEditForm] = useState({
    label: "",
    api_key: "",
    default_model: "",
    fallback_model: "",
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      setConfigs(await res.json());
    }
    setLoading(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setEditForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleFetchModels(apiKey: string, provider: string, configId?: string) {
    setFetchingModels(true);
    setError(null);

    const body: Record<string, string> = { provider };
    if (apiKey && !apiKey.startsWith("\u2022")) {
      body.api_key = apiKey;
    } else if (configId) {
      body.config_id = configId;
    } else {
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
      setFetchedModels((prev) => ({ ...prev, [provider]: data.models }));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to fetch models");
    }

    setFetchingModels(false);
  }

  async function handleAddConfig(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ provider: "gemini", label: "", api_key: "", default_model: "", fallback_model: "", is_active: false });
      await fetchConfigs();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add config");
    }
    setSubmitting(false);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    setError(null);

    const body: Record<string, string | null> = {
      id: editingId,
      label: editForm.label,
      default_model: editForm.default_model,
      fallback_model: editForm.fallback_model || null,
    };

    if (editForm.api_key && !editForm.api_key.startsWith("\u2022")) {
      body.api_key = editForm.api_key;
    }

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
      const data = await res.json();
      setError(data.error || "Failed to save changes");
    }
    setSubmitting(false);
  }

  function handleStartEdit(config: AiConfig) {
    setEditingId(config.id);
    setEditForm({
      label: config.label,
      api_key: config.encrypted_key,
      default_model: config.default_model,
      fallback_model: config.fallback_model || "",
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  async function handleToggleActive(config: AiConfig) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.id, is_active: !config.is_active }),
    });

    if (res.ok) {
      await fetchConfigs();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to toggle active");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/admin/settings?id=${id}`, { method: "DELETE" });

    if (res.ok) {
      setConfirmDelete(null);
      await fetchConfigs();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete config");
    }
    setDeleting(null);
  }

  const grouped = PROVIDERS.map((provider) => ({
    provider,
    configs: configs.filter((c) => c.provider === provider),
  }));

  const hasActiveConfig = configs.some((c) => c.is_active);

  const modelsForProvider = (provider: string) => fetchedModels[provider] || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted mt-1">Manage API keys and system configuration</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      <section className="bg-surface rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground">AI Configurations</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            <span className="text-base leading-none">{showForm ? "\u2212" : "+"}</span>
            {showForm ? "Cancel" : "Add Config"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddConfig} className="p-6 border-b border-border bg-background/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Provider</label>
                <select
                  name="provider"
                  value={form.provider}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Label</label>
                <input
                  name="label"
                  value={form.label}
                  onChange={handleFormChange}
                  placeholder="e.g. Production Key"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    name="api_key"
                    value={form.api_key}
                    onChange={handleFormChange}
                    placeholder="Enter API key"
                    required
                    type="password"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchModels(form.api_key, form.provider)}
                    disabled={fetchingModels || !form.api_key}
                    className="px-3 py-2 text-xs font-medium bg-surface border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-50 shrink-0"
                    title="Fetch available models from provider"
                  >
                    {fetchingModels ? (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        Loading
                      </span>
                    ) : (
                      "Fetch Models"
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Default Model</label>
                <input
                  name="default_model"
                  value={form.default_model}
                  onChange={handleFormChange}
                  placeholder="e.g. gemini-2.0-flash"
                  list="default-model-list"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <datalist id="default-model-list">
                  {modelsForProvider(form.provider).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fallback Model (optional)</label>
                <input
                  name="fallback_model"
                  value={form.fallback_model}
                  onChange={handleFormChange}
                  placeholder="e.g. gemini-2.0-flash-lite"
                  list="fallback-model-list"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <datalist id="fallback-model-list">
                  {modelsForProvider(form.provider).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleFormChange}
                  className="rounded border-border text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-foreground">Set as active</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="ml-auto px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Config"}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-muted">Loading...</div>
          ) : (
            grouped.map(({ provider, configs: providerConfigs }) => (
              <div key={provider} className="px-6 py-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                  {provider}
                </h3>
                {providerConfigs.length === 0 ? (
                  <div className="text-sm text-muted italic">No configs</div>
                ) : (
                  <div className="space-y-3">
                    {providerConfigs.map((config) => (
                      <div key={config.id}>
                        {editingId === config.id ? (
                          <form onSubmit={handleSaveEdit} className="p-4 rounded-lg border border-border bg-background/50 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-muted mb-1">Label</label>
                                <input
                                  name="label"
                                  value={editForm.label}
                                  onChange={handleEditChange}
                                  required
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted mb-1">API Key</label>
                                <div className="flex gap-2">
                                  <input
                                    name="api_key"
                                    value={editForm.api_key}
                                    onChange={handleEditChange}
                                    type="password"
                                    placeholder="Leave as-is to keep current key"
                                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleFetchModels(editForm.api_key, config.provider, config.id)}
                                    disabled={fetchingModels}
                                    className="px-3 py-2 text-xs font-medium bg-surface border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-50 shrink-0"
                                    title="Fetch available models from provider"
                                  >
                                    {fetchingModels ? (
                                      <span className="flex items-center gap-1">
                                        <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        Loading
                                      </span>
                                    ) : (
                                      "Fetch Models"
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted mb-1">Default Model</label>
                                <input
                                  name="default_model"
                                  value={editForm.default_model}
                                  onChange={handleEditChange}
                                  list="edit-default-model-list"
                                  required
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                                />
                                <datalist id="edit-default-model-list">
                                  {modelsForProvider(config.provider).map((m) => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                  ))}
                                </datalist>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted mb-1">Fallback Model (optional)</label>
                                <input
                                  name="fallback_model"
                                  value={editForm.fallback_model}
                                  onChange={handleEditChange}
                                  list="edit-fallback-model-list"
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                                />
                                <datalist id="edit-fallback-model-list">
                                  {modelsForProvider(config.provider).map((m) => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                  ))}
                                </datalist>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                              >
                                {submitting ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-background/30">
                            <span className="text-lg">{config.is_active ? "\ud83d\udfe2" : "\u26aa"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground text-sm">{config.label}</span>
                                <span className="text-xs font-mono text-muted">{config.encrypted_key}</span>
                              </div>
                              <p className="text-xs text-muted mt-0.5">
                                Model: {config.default_model}
                                {config.fallback_model && <span> &middot; Fallback: {config.fallback_model}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleStartEdit(config)}
                                className="px-2 py-1 text-xs font-medium text-muted border border-border rounded hover:text-foreground transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleActive(config)}
                                title={config.is_active ? "Deactivate" : "Activate"}
                                className={`relative shrink-0 w-10 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${config.is_active ? "bg-accent" : "bg-border"}`}
                              >
                                <span
                                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.is_active ? "translate-x-4" : "translate-x-0"}`}
                                />
                              </button>
                              {confirmDelete === config.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(config.id)}
                                    disabled={deleting === config.id}
                                    className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                                  >
                                    {deleting === config.id ? "..." : "Confirm"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="px-2 py-1 text-xs font-medium text-muted border border-border rounded hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (config.is_active) {
                                      setError("Deactivate this config before deleting.");
                                    } else {
                                      setConfirmDelete(config.id);
                                    }
                                  }}
                                  disabled={config.is_active}
                                  title={config.is_active ? "Deactivate first" : "Delete"}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    config.is_active
                                      ? "text-border cursor-not-allowed"
                                      : "text-muted hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200"
                                  }`}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {!hasActiveConfig && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>
            No active AI config &mdash; AI generation is disabled until a config is activated.
          </span>
        </div>
      )}
    </div>
  );
}
