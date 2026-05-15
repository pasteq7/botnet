"use client";
import { useState } from "react";
import { Loader, ChevronLeft, Info, ChevronDown, ChevronUp } from "lucide-react";
import { type AiConfig, type ModelOption, PROVIDERS, Field, Toggle, inputCls } from "./shared";

const NATIVE_SEARCH_PROVIDERS = new Set(["gemini"]);

type ConfigPayload = Record<string, string | boolean | null>;

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
  onSubmit: (data: ConfigPayload | ConfigPayload[]) => void;
  onCancel: () => void;
  submitting: boolean;
  fetchedModels: Record<string, ModelOption[]>;
  fetchingModels: boolean;
  onFetchModels: (key: string, provider: string, id?: string, baseUrl?: string) => void;
}) {
  const isEdit = !!initial?.id;

  const [label, setLabel] = useState(initial?.label ?? "");
  const [apiKey, setApiKey] = useState(initial?.encrypted_key ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [defaultModel, setDefaultModel] = useState(initial?.default_model ?? "");
  const [fallbackModel, setFallbackModel] = useState(initial?.fallback_model ?? "");
  const [activate, setActivate] = useState(false);

  /* ── Create mode only ── */
  const [pipelineGoal, setPipelineGoal] = useState<"generate" | "search-generate" | null>(null);

  /* ── Search + generate path ── */
  const [provider, setProvider] = useState(initial?.provider ?? "gemini");
  const [builtinSearch, setBuiltinSearch] = useState<"yes" | "no" | null>(
    initial?.search_mode === "native" ? "yes" : initial?.search_mode === "external" ? "no" : null
  );

  /* ── Separate generator (Journey C) ── */
  const [separateGen, setSeparateGen] = useState(false);
  const [genProvider, setGenProvider] = useState(initial?.provider ?? "gemini");
  const [genLabel, setGenLabel] = useState("");
  const [genApiKey, setGenApiKey] = useState("");
  const [genBaseUrl, setGenBaseUrl] = useState("");
  const [genDefaultModel, setGenDefaultModel] = useState("");
  const [genFallbackModel, setGenFallbackModel] = useState("");

  /* ── Edit mode explicit fields ── */
  const [searchMode, setSearchMode] = useState(initial?.search_mode ?? "none");

  const supportsNative = NATIVE_SEARCH_PROVIDERS.has(provider);
  const models = fetchedModels[provider] ?? [];
  const genModels = fetchedModels[genProvider] ?? [];

  const autoLabel = `${provider.charAt(0).toUpperCase() + provider.slice(1)}${defaultModel ? ` — ${defaultModel}` : ""}`;
  const genAutoLabel = `${genProvider.charAt(0).toUpperCase() + genProvider.slice(1)}${genDefaultModel ? ` — ${genDefaultModel}` : ""}`;

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    if (pipelineGoal === "search-generate") {
      setLabel(newProvider.charAt(0).toUpperCase() + newProvider.slice(1));
      setBuiltinSearch(NATIVE_SEARCH_PROVIDERS.has(newProvider) ? "yes" : "no");
    }
  }

  function handleModelChange(value: string) {
    setDefaultModel(value);
    if (pipelineGoal === "search-generate" && label === provider.charAt(0).toUpperCase() + provider.slice(1)) {
      setLabel(value ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} — ${value}` : provider.charAt(0).toUpperCase() + provider.slice(1));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      const data: ConfigPayload = {
        label: label || autoLabel,
        api_key: apiKey && !apiKey.startsWith("\u2022") ? apiKey : null,
        default_model: defaultModel,
        fallback_model: fallbackModel || null,
        search_mode: searchMode,
        is_active: initial?.is_active ?? false,
      };
      if (baseUrl) data.base_url = baseUrl;
      if (provider === "local" && !baseUrl) data.base_url = "http://localhost:11434/v1";
      onSubmit(data);
      return;
    }

    const makeConfig = (overrides: Record<string, string | boolean | null>): ConfigPayload => ({
      api_key: apiKey,
      default_model: defaultModel,
      fallback_model: fallbackModel || null,
      is_active: activate,
      ...overrides,
    });

    if (pipelineGoal === "generate") {
      onSubmit(makeConfig({
        provider,
        label: label || autoLabel,
        role: "full",
        search_mode: "none",
      }));
      return;
    }

    if (pipelineGoal === "search-generate") {
      const searchModeValue = builtinSearch === "yes" ? "native" : "external";

      if (separateGen) {
        const genApiKeyValue = genProvider === provider ? (genApiKey || apiKey) : genApiKey;
        const genLabelValue = genLabel || genAutoLabel;

        const searchCfg: ConfigPayload = {
          provider,
          label: label || autoLabel,
          api_key: apiKey,
          default_model: defaultModel,
          fallback_model: fallbackModel || null,
          role: "searcher",
          search_mode: searchModeValue,
          is_active: activate,
        };
        if (baseUrl) searchCfg.base_url = baseUrl;
        if (provider === "local" && !baseUrl) searchCfg.base_url = "http://localhost:11434/v1";

        const genCfg: ConfigPayload = {
          provider: genProvider,
          label: genLabelValue,
          api_key: genApiKeyValue,
          default_model: genDefaultModel,
          fallback_model: genFallbackModel || null,
          role: "generator",
          search_mode: "none",
          is_active: activate,
        };
        if (genBaseUrl) genCfg.base_url = genBaseUrl;
        if (genProvider === "local" && !genBaseUrl) genCfg.base_url = "http://localhost:11434/v1";

        onSubmit([searchCfg, genCfg]);
      } else {
        onSubmit(makeConfig({
          provider,
          label: label || autoLabel,
          role: "full",
          search_mode: searchModeValue,
        }));
      }
    }
  }

  /* ── Step 1: Pipeline goal ── */
  if (!isEdit && !pipelineGoal) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors -ml-1.5">
            <ChevronLeft className="size-5" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">Add config</h3>
        </div>

        <div className="bg-surface/50 border border-border/60 rounded-xl p-5 space-y-4">
          <label className="block text-sm font-semibold text-muted/90 tracking-tight">
            How should content be generated?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setPipelineGoal("generate"); setProvider("openai"); setBuiltinSearch(null); }}
              className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-surface text-left hover:border-accent/40 hover:bg-accent/5 transition-all group"
            >
              <span className="text-sm font-bold text-foreground group-hover:text-accent transition-colors mb-1">Generate only</span>
              <span className="text-xs text-muted/70 leading-relaxed">Use a model to write posts directly, no web search needed</span>
            </button>
            <button
              type="button"
              onClick={() => { setPipelineGoal("search-generate"); setProvider("gemini"); setBuiltinSearch("yes"); }}
              className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-surface text-left hover:border-accent/40 hover:bg-accent/5 transition-all group"
            >
              <span className="text-sm font-bold text-foreground group-hover:text-accent transition-colors mb-1">Search, then generate</span>
              <span className="text-xs text-muted/70 leading-relaxed">Ground content in real web results using one model or two</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: Form ── */
  const isSearchGenerate = pipelineGoal === "search-generate";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={isEdit ? onCancel : () => { if (!isEdit && pipelineGoal) setPipelineGoal(null); else onCancel(); }}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors -ml-1.5"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {isEdit ? "Edit config" : isSearchGenerate ? "Search, then generate" : "Generate only"}
        </h3>
      </div>

      <div className="bg-surface/50 border border-border/60 rounded-xl p-5 space-y-5">
        {/* Provider + Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEdit && (
            <Field label="Provider">
              <select value={provider} onChange={e => handleProviderChange(e.target.value)} className={inputCls}>
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </Field>
          )}
          {isEdit && (
            <Field label="Provider">
              <div className="px-3 py-2 rounded-lg border border-border/60 bg-surface/50 text-sm text-muted">
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </div>
            </Field>
          )}
          <Field label="Label" hint={`Auto-generated as "${provider.charAt(0).toUpperCase() + provider.slice(1)} — {model}" if left empty`}>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={autoLabel}
              className={inputCls}
            />
          </Field>
        </div>

        {/* API Key */}
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
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted bg-surface border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {fetchingModels
                ? <><Loader className="size-3.5 animate-spin" /> Loading</>
                : "Fetch models"}
            </button>
          </div>
        </Field>

        {/* Base URL (local only) */}
        {provider === "local" && (
          <Field label="Base URL" hint="Defaults to http://localhost:11434/v1 if left blank">
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className={inputCls}
            />
          </Field>
        )}

        {/* Models */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Model">
            <input
              value={defaultModel}
              onChange={e => handleModelChange(e.target.value)}
              list="config-model-default"
              required
              placeholder="e.g. gemini-2.0-flash"
              className={inputCls}
            />
            <datalist id="config-model-default">
              {models.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
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
              {models.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
            </datalist>
          </Field>
        </div>

        {/* ── Search + generate: built-in question ── */}
        {isSearchGenerate && (
          <>
            <hr className="border-border/40" />
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-muted/90 tracking-tight">
                Does your model support built-in search?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBuiltinSearch("yes")}
                  disabled={!supportsNative}
                  className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${builtinSearch === "yes"
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : !supportsNative
                      ? "border-border/40 bg-surface/30 text-muted/40 cursor-not-allowed opacity-50"
                      : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                    }`}
                >
                  <span className="text-sm font-bold mb-1">Yes — built-in</span>
                  <span className={`text-xs leading-snug ${builtinSearch === "yes" ? "text-muted/90" : "text-muted/60"}`}>
                    {supportsNative ? "Model handles search natively" : `Not available for ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuiltinSearch("no")}
                  className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${builtinSearch === "no"
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                    }`}
                >
                  <span className="text-sm font-bold mb-1">No — external API</span>
                  <span className={`text-xs leading-snug ${builtinSearch === "no" ? "text-muted/90" : "text-muted/60"}`}>
                    Use Tavily, Brave, etc.
                  </span>
                </button>
              </div>
              {builtinSearch === "no" && (
                <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" />
                  You&apos;ll need to configure an External Search API in the Search tab.
                </p>
              )}
            </div>

            {/* ── Separate generator expander (Journey C) ── */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSeparateGen(!separateGen)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                {separateGen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Use a different model for generation
              </button>

              {separateGen && (
                <div className="mt-4 pl-4 border-l-2 border-border/40 space-y-4">
                  <p className="text-xs text-muted/60">Configure a separate model that writes content using search results from the model above.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Generator provider">
                      <select value={genProvider} onChange={e => setGenProvider(e.target.value)} className={inputCls}>
                        {PROVIDERS.map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Label" hint="Auto-generated if left empty">
                      <input
                        value={genLabel}
                        onChange={e => setGenLabel(e.target.value)}
                        placeholder={genAutoLabel}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field label="API Key" hint={genProvider === provider ? "Leave blank to reuse the key above" : undefined}>
                    <input
                      value={genApiKey}
                      onChange={e => setGenApiKey(e.target.value)}
                      type="password"
                      placeholder={genProvider === provider ? "Same as above" : "sk-\u2026"}
                      className={inputCls}
                    />
                  </Field>

                  {genProvider === "local" && (
                    <Field label="Base URL" hint="Defaults to http://localhost:11434/v1 if left blank">
                      <input
                        value={genBaseUrl}
                        onChange={e => setGenBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className={inputCls}
                      />
                    </Field>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Model">
                      <input
                        value={genDefaultModel}
                        onChange={e => {
                          setGenDefaultModel(e.target.value);
                          if (!genLabel && e.target.value) {
                            setGenLabel(`${genProvider.charAt(0).toUpperCase() + genProvider.slice(1)} — ${e.target.value}`);
                          }
                        }}
                        list="config-model-gen"
                        required
                        placeholder="e.g. gpt-4o"
                        className={inputCls}
                      />
                      <datalist id="config-model-gen">
                        {genModels.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
                      </datalist>
                    </Field>
                    <Field label="Fallback model" hint="Optional">
                      <input
                        value={genFallbackModel}
                        onChange={e => setGenFallbackModel(e.target.value)}
                        list="config-model-gen-fallback"
                        placeholder="e.g. gpt-4o-mini"
                        className={inputCls}
                      />
                      <datalist id="config-model-gen-fallback">
                        {genModels.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
                      </datalist>
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onFetchModels(genApiKey || apiKey, genProvider)}
                      disabled={fetchingModels || (!genApiKey && genProvider !== provider)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted bg-surface border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      {fetchingModels
                        ? <><Loader className="size-3.5 animate-spin" /> Loading</>
                        : "Fetch models"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Edit mode: search settings ── */}
        {isEdit && (
          <>
            <hr className="border-border/40" />
            {initial?.role === "generator" ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 text-sm text-violet-300/80">
                <Info className="size-4 shrink-0" />
                <span>This config writes content using search results from a Searcher config.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-muted/90 tracking-tight">Web search</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchMode("none")}
                    className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${searchMode === "none"
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                      }`}
                  >
                    <span className="text-sm font-bold mb-1">Off</span>
                    <span className={`text-xs leading-snug ${searchMode === "none" ? "text-muted/90" : "text-muted/60"}`}>
                      Generate without web results
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("native")}
                    disabled={!supportsNative}
                    className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${searchMode === "native"
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : !supportsNative
                        ? "border-border/40 bg-surface/30 text-muted/40 cursor-not-allowed opacity-50"
                        : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                      }`}
                  >
                    <span className="text-sm font-bold mb-1">Built-in</span>
                    <span className={`text-xs leading-snug ${searchMode === "native" ? "text-muted/90" : "text-muted/60"}`}>
                      {supportsNative ? "Model handles search natively" : `Not available for ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("external")}
                    className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${searchMode === "external"
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : "border-border/60 bg-surface text-muted hover:border-border hover:bg-surface-hover"
                      }`}
                  >
                    <span className="text-sm font-bold mb-1">External API</span>
                    <span className={`text-xs leading-snug ${searchMode === "external" ? "text-muted/90" : "text-muted/60"}`}>
                      Tavily, Brave, etc.
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
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
            {submitting
              ? <><Loader className="size-3.5 animate-spin" /> Saving</>
              : isEdit ? "Save changes" : "Add config"}
          </button>
        </div>
      </div>
    </form>
  );
}
