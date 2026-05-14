// components\admin\settings\ConfigForm.tsx
"use client";
import { useState } from "react";
import { Loader, ChevronLeft } from "lucide-react";
import { type AiConfig, type ModelOption, PROVIDERS, ROLE_META, SEARCH_MODE_META, Field, Toggle, inputCls } from "./shared";

export default function ConfigForm({
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
  onFetchModels: (key: string, provider: string, id?: string, baseUrl?: string) => void;
}) {
  const isEdit = !!initial?.id;
  const [provider, setProvider] = useState(initial?.provider ?? "gemini");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [apiKey, setApiKey] = useState(initial?.encrypted_key ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [defaultModel, setDefaultModel] = useState(initial?.default_model ?? "");
  const [fallbackModel, setFallbackModel] = useState(initial?.fallback_model ?? "");
  const [role, setRole] = useState(initial?.role ?? "full");
  const [searchMode, setSearchMode] = useState(initial?.search_mode ?? "none");
  const [activate, setActivate] = useState(false);

  const models = fetchedModels[provider] ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, string | boolean | null> = {
      ...(isEdit ? {} : { provider }),
      label,
      api_key: (apiKey && !apiKey.startsWith("\u2022")) ? apiKey : null,
      default_model: defaultModel,
      fallback_model: fallbackModel || null,
      role,
      search_mode: searchMode,
      is_active: isEdit ? (initial?.is_active ?? false) : activate,
    };
    if (baseUrl) data.base_url = baseUrl;
    if (provider === "local" && !baseUrl) data.base_url = "http://localhost:11434/v1";
    onSubmit(data);
  }

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
          {isEdit ? "Edit config" : "Add config"}
        </h3>
      </div>

      <div className="bg-surface/50 border border-border/60 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEdit && (
            <Field label="Provider">
              <select value={provider} onChange={e => setProvider(e.target.value)} className={inputCls}>
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Label" hint={isEdit ? undefined : "A nickname for this config"}>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Production"
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="API Key">
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
              placeholder={isEdit ? "Leave blank to keep current key" : "sk-\u2026"}
              required={!isEdit}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onFetchModels(apiKey, provider, initial?.id, baseUrl)}
              disabled={fetchingModels || (!apiKey && !initial?.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted bg-surface border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {fetchingModels ? (
                <><Loader className="size-3.5 animate-spin" /> Loading</>
              ) : (
                "Fetch models"
              )}
            </button>
          </div>
        </Field>

        {provider === "local" && (
          <Field label="Base URL" hint="e.g. http://localhost:11434/v1">
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className={inputCls}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default model">
            <input
              value={defaultModel}
              onChange={e => setDefaultModel(e.target.value)}
              list="config-model-default"
              required
              placeholder="e.g. gemini-2.0-flash"
              className={inputCls}
            />
            <datalist id="config-model-default">
              {models.map(m => <option key={m.id} value={m.id} />)}
            </datalist>
          </Field>
          <Field label="Fallback model" hint="Optional">
            <input
              value={fallbackModel}
              onChange={e => setFallbackModel(e.target.value)}
              list="config-model-fallback"
              placeholder="e.g. gemini-2.0-flash-lite"
              className={inputCls}
            />
            <datalist id="config-model-fallback">
              {models.map(m => <option key={m.id} value={m.id} />)}
            </datalist>
          </Field>
        </div>

        <Field label="Role">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(ROLE_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${role === key
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                  }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                  <span className={`size-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <span className={`text-xs leading-snug hidden sm:block ${role === key ? "text-muted/90" : "text-muted/70"}`}>
                  {meta.hint}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Search mode">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(SEARCH_MODE_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchMode(key)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${searchMode === key
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                  }`}
              >
                <span className="text-xs font-bold mb-0.5">{meta.label}</span>
                <span className={`text-xs leading-snug hidden sm:block ${searchMode === key ? "text-muted/90" : "text-muted/70"}`}>
                  {meta.hint}
                </span>
              </button>
            ))}
          </div>
        </Field>
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
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <><Loader className="size-3.5 animate-spin" /> Saving</>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add config"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}