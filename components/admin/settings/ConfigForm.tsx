"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Info,
  Loader,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  type AiConfig,
  type ModelOption,
  PROVIDERS,
  Field,
  Toggle,
  inputCls,
  LOCAL_DEFAULT_BASE_URL,
  modelCacheKey,
  providerLabel,
} from "./shared";

const NATIVE_SEARCH_PROVIDERS = new Set(["gemini"]);

type ConfigPayload = Record<string, string | boolean | null>;
type PipelineGoal = "generate" | "search-generate";

export default function ConfigForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  fetchedModels,
  fetchingModels,
  onFetchModels,
  error,
  onClearError,
}: {
  initial?: Partial<AiConfig>;
  onSubmit: (data: ConfigPayload | ConfigPayload[]) => void;
  onCancel: () => void;
  submitting: boolean;
  fetchedModels: Record<string, ModelOption[]>;
  fetchingModels: boolean;
  onFetchModels: (key: string, provider: string, id?: string, baseUrl?: string) => void;
  error?: string | null;
  onClearError?: () => void;
}) {
  const isEdit = !!initial?.id;

  const [pipelineGoal, setPipelineGoal] = useState<PipelineGoal | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGenAdvanced, setShowGenAdvanced] = useState(false);

  const initialProvider = initial?.provider ?? "openai";
  const initialDefaultModel = initial?.default_model ?? "";
  const initialAutoLabel = `${providerLabel(initialProvider)}${initialDefaultModel ? ` - ${initialDefaultModel}` : ""}`;
  const initialCustomLabel = initial?.label?.trim() === initialAutoLabel ? "" : initial?.label ?? "";

  const [provider, setProvider] = useState(initialProvider);
  const [label, setLabel] = useState(initialCustomLabel);
  const [apiKey, setApiKey] = useState(initial?.encrypted_key ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [defaultModel, setDefaultModel] = useState(initialDefaultModel);
  const [fallbackModel, setFallbackModel] = useState(initial?.fallback_model ?? "");
  const [activate, setActivate] = useState(false);

  const [builtinSearch, setBuiltinSearch] = useState<"yes" | "no">(
    initial?.search_mode === "external" ? "no" : "yes"
  );
  const [searchMode, setSearchMode] = useState(initial?.search_mode ?? "none");

  const [separateGen, setSeparateGen] = useState(false);
  const [genProvider, setGenProvider] = useState("openai");
  const [genLabel, setGenLabel] = useState("");
  const [genApiKey, setGenApiKey] = useState("");
  const [genBaseUrl, setGenBaseUrl] = useState("");
  const [genDefaultModel, setGenDefaultModel] = useState("");
  const [genFallbackModel, setGenFallbackModel] = useState("");

  const selectedGoal = isEdit ? null : pipelineGoal;
  const isSearchGenerate = selectedGoal === "search-generate";
  const supportsNative = NATIVE_SEARCH_PROVIDERS.has(provider);
  const modelKey = modelCacheKey(provider, baseUrl);
  const genModelKey = modelCacheKey(genProvider, genBaseUrl);
  const models = fetchedModels[modelKey] ?? [];
  const genModels = fetchedModels[genModelKey] ?? [];

  const autoLabel = `${providerLabel(provider)}${defaultModel ? ` - ${defaultModel}` : ""}`;
  const genAutoLabel = `${providerLabel(genProvider)}${genDefaultModel ? ` - ${genDefaultModel}` : ""}`;
  const localBaseUrl = (baseUrl || LOCAL_DEFAULT_BASE_URL).trim();
  const genLocalBaseUrl = (genBaseUrl || LOCAL_DEFAULT_BASE_URL).trim();

  function withBaseUrl(payload: ConfigPayload, payloadProvider: string, value: string) {
    if (payloadProvider === "local") payload.base_url = (value || LOCAL_DEFAULT_BASE_URL).trim();
  }

  function handleProviderChange(nextProvider: string) {
    setProvider(nextProvider);
    if (selectedGoal === "search-generate") {
      setBuiltinSearch(NATIVE_SEARCH_PROVIDERS.has(nextProvider) ? "yes" : "no");
    }
  }

  function handleGoal(goal: PipelineGoal) {
    setPipelineGoal(goal);
    if (goal === "generate") {
      setProvider("openai");
      setBuiltinSearch("yes");
    } else {
      setProvider("gemini");
      setBuiltinSearch("yes");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      const data: ConfigPayload = {
        label: label.trim() || autoLabel,
        api_key: apiKey && !apiKey.startsWith("\u2022") ? apiKey : null,
        default_model: defaultModel,
        fallback_model: fallbackModel || null,
        search_mode: searchMode,
        is_active: initial?.is_active ?? false,
      };
      withBaseUrl(data, provider, baseUrl);
      onSubmit(data);
      return;
    }

    const basePayload = (): ConfigPayload => {
      const payload: ConfigPayload = {
        provider,
        label: label.trim() || autoLabel,
        api_key: provider === "local" ? apiKey || "" : apiKey,
        default_model: defaultModel,
        fallback_model: fallbackModel || null,
        is_active: activate,
      };
      withBaseUrl(payload, provider, baseUrl);
      return payload;
    };

    if (pipelineGoal === "generate") {
      onSubmit({
        ...basePayload(),
        role: "generator",
        search_mode: "none",
      });
      return;
    }

    if (pipelineGoal === "search-generate") {
      const searchModeValue = builtinSearch === "yes" ? "native" : "external";

      if (!separateGen) {
        onSubmit({
          ...basePayload(),
          role: "full",
          search_mode: searchModeValue,
        });
        return;
      }

      const searchCfg: ConfigPayload = {
        ...basePayload(),
        role: "searcher",
        search_mode: searchModeValue,
      };

      const genCfg: ConfigPayload = {
        provider: genProvider,
        label: genLabel.trim() || genAutoLabel,
        api_key: genProvider === provider ? genApiKey || apiKey : genApiKey,
        default_model: genDefaultModel,
        fallback_model: genFallbackModel || null,
        role: "generator",
        search_mode: "none",
        is_active: activate,
      };
      if (genProvider === "local") genCfg.api_key = genApiKey || "";
      withBaseUrl(genCfg, genProvider, genBaseUrl);
      onSubmit([searchCfg, genCfg]);
    }
  }

  if (!isEdit && !pipelineGoal) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <FormHeader title="Add AI model" onBack={onCancel} />
        <div className="space-y-3">
          <p className="text-sm text-muted leading-relaxed">
            Pick the workflow first. Provider details stay focused on the next screen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChoiceButton
              icon={Sparkles}
              title="Generator"
              description="Writes content without changing your Searcher."
              onClick={() => handleGoal("generate")}
            />
            <ChoiceButton
              icon={Search}
              title="Search and generate"
              description="Use built-in or external web search tool before writing."
              onClick={() => handleGoal("search-generate")}
              featured
            />
          </div>
        </div>
      </div>
    );
  }

  const canFetchPrimary = provider === "local" || !!apiKey || !!initial?.id;
  const canFetchGenerator = genProvider === "local" || !!genApiKey || genProvider === provider;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <FormHeader
        title={isEdit ? "Edit AI model" : isSearchGenerate ? "Search and generate" : "Generator"}
        onBack={isEdit ? onCancel : () => setPipelineGoal(null)}
      />

      {error && (
        <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {onClearError && (
            <button type="button" onClick={onClearError} className="text-red-400/50 hover:text-red-400 mt-0.5">
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <section className="space-y-5">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Provider</h4>
          <p className="text-sm text-muted">Connect the model endpoint, then choose the model name.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEdit ? (
            <Field label="Provider">
              <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} className={inputCls}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{providerLabel(p)}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Provider">
              <div className="px-3 py-2 rounded-lg border border-border/60 bg-surface/50 text-sm text-muted">
                {providerLabel(provider)}
              </div>
            </Field>
          )}

          {provider === "local" && (
            <Field label="Base URL">
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={LOCAL_DEFAULT_BASE_URL}
                className={inputCls}
              />
            </Field>
          )}
        </div>

        <Field label={provider === "local" ? "API key" : "API key"}>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={provider === "local" ? "Optional for local endpoints" : isEdit ? "Leave blank to keep current key" : "sk-..."}
            required={!isEdit && provider !== "local"}
            className={inputCls}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Model</h4>
            <p className="text-sm text-muted">Fetch available models or type the model ID directly.</p>
          </div>
          <button
            type="button"
            onClick={() => onFetchModels(apiKey, provider, initial?.id, provider === "local" ? localBaseUrl : undefined)}
            disabled={fetchingModels || !canFetchPrimary}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-surface border border-border/60 rounded-lg hover:bg-surface-hover disabled:opacity-40"
          >
            {fetchingModels ? <Loader className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
            Models
          </button>
        </div>

        <Field label="Model">
          <input
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            list="config-model-default"
            required
            placeholder={provider === "local" ? "llama3.1" : "gpt-4o-mini"}
            className={inputCls}
          />
          <datalist id="config-model-default">
            {models.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
          </datalist>
        </Field>
      </section>

      {isSearchGenerate && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Search</h4>
            <p className="text-sm text-muted">Choose how this workflow gets fresh web context.</p>
          </div>
          <SegmentedSearch
            value={builtinSearch}
            onChange={setBuiltinSearch}
            supportsNative={supportsNative}
            provider={provider}
          />
          {builtinSearch === "no" && (
            <p className="flex items-center gap-2 text-sm text-amber-400/85">
              <Info className="size-4 shrink-0" />
              Configure an active provider in the External Search API tab.
            </p>
          )}

          <div className="rounded-lg border border-border/60 bg-surface/30">
            <button
              type="button"
              onClick={() => setSeparateGen(!separateGen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-surface-hover rounded-lg"
            >
              <span>Use a separate writer model</span>
              {separateGen ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
            </button>

            {separateGen && (
              <div className="border-t border-border/60 p-3 sm:p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Writer provider">
                    <select value={genProvider} onChange={(e) => setGenProvider(e.target.value)} className={inputCls}>
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{providerLabel(p)}</option>
                      ))}
                    </select>
                  </Field>
                  {genProvider === "local" && (
                    <Field label="Base URL">
                      <input
                        value={genBaseUrl}
                        onChange={(e) => setGenBaseUrl(e.target.value)}
                        placeholder={LOCAL_DEFAULT_BASE_URL}
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>

                <Field label="API key">
                  <input
                    value={genApiKey}
                    onChange={(e) => setGenApiKey(e.target.value)}
                    type="password"
                    placeholder={
                      genProvider === "local"
                        ? "Optional for local endpoints"
                        : genProvider === provider
                          ? "Leave blank to reuse provider key"
                          : "sk-..."
                    }
                    required={genProvider !== "local" && genProvider !== provider}
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Field label="Writer model">
                      <input
                        value={genDefaultModel}
                        onChange={(e) => setGenDefaultModel(e.target.value)}
                        list="config-model-gen"
                        required
                        placeholder={genProvider === "local" ? "llama3.1" : "gpt-4o-mini"}
                        className={inputCls}
                      />
                      <datalist id="config-model-gen">
                        {genModels.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
                      </datalist>
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFetchModels(genApiKey || apiKey, genProvider, undefined, genProvider === "local" ? genLocalBaseUrl : undefined)}
                    disabled={fetchingModels || !canFetchGenerator}
                    className="mb-0.5 shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-surface border border-border/60 rounded-lg hover:bg-surface-hover disabled:opacity-40"
                  >
                    {fetchingModels ? <Loader className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
                    Models
                  </button>
                </div>

                <AdvancedBlock open={showGenAdvanced} onToggle={() => setShowGenAdvanced(!showGenAdvanced)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Label">
                      <input value={genLabel} onChange={(e) => setGenLabel(e.target.value)} placeholder={genAutoLabel} className={inputCls} />
                    </Field>
                    <Field label="Fallback model">
                      <input
                        value={genFallbackModel}
                        onChange={(e) => setGenFallbackModel(e.target.value)}
                        list="config-model-gen-fallback"
                        placeholder="Optional"
                        className={inputCls}
                      />
                      <datalist id="config-model-gen-fallback">
                        {genModels.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
                      </datalist>
                    </Field>
                  </div>
                </AdvancedBlock>
              </div>
            )}
          </div>
        </section>
      )}

      {isEdit && initial?.role !== "generator" && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Search</h4>
            <p className="text-sm text-muted">Control whether this saved config uses web context.</p>
          </div>
          <EditSearchMode value={searchMode} onChange={setSearchMode} supportsNative={supportsNative} provider={provider} />
        </section>
      )}

      {isEdit && initial?.role === "generator" && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 text-sm text-violet-300/80">
          <Info className="size-4 shrink-0" />
          <span>This generator writes content and can use results from an active Searcher when search is needed.</span>
        </div>
      )}

      <AdvancedBlock open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Label">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={autoLabel} className={inputCls} />
          </Field>
          <Field label="Fallback model">
            <input
              value={fallbackModel}
              onChange={(e) => setFallbackModel(e.target.value)}
              list="config-model-fallback"
              placeholder="Optional"
              className={inputCls}
            />
            <datalist id="config-model-fallback">
              {models.map((m, i) => <option key={`${m.id}-${i}`} value={m.id} />)}
            </datalist>
          </Field>
        </div>
      </AdvancedBlock>

      <div className="flex items-center justify-between gap-3 pt-1">
        {!isEdit && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Toggle checked={activate} onChange={() => setActivate(!activate)} />
            <span className="text-sm text-muted">Activate now</span>
          </label>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted bg-transparent border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? <Loader className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            {isEdit ? "Save changes" : "Add model"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg -ml-1.5">
        <ChevronLeft className="size-5" />
      </button>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function ChoiceButton({
  icon: Icon,
  title,
  description,
  onClick,
  featured,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-start gap-3 p-4 rounded-lg border text-left bg-surface/50 hover:bg-surface-hover ${featured ? "border-accent/50" : "border-border/60 hover:border-border"
        }`}
    >
      <span className="mt-0.5 rounded-md bg-accent/10 p-2 text-accent">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted leading-relaxed">{description}</span>
      </span>
    </button>
  );
}

function AdvancedBlock({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
        <SlidersHorizontal className="size-4" />
        Advanced
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}

function SegmentedSearch({
  value,
  onChange,
  supportsNative,
  provider,
}: {
  value: "yes" | "no";
  onChange: (value: "yes" | "no") => void;
  supportsNative: boolean;
  provider: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <SearchOption
        active={value === "yes"}
        disabled={!supportsNative}
        title="Built-in search"
        description={supportsNative ? "The model searches directly." : `Unavailable for ${providerLabel(provider)}.`}
        onClick={() => onChange("yes")}
      />
      <SearchOption
        active={value === "no"}
        title="External API"
        description="Use Tavily, Brave, or another search provider."
        onClick={() => onChange("no")}
      />
    </div>
  );
}

function EditSearchMode({
  value,
  onChange,
  supportsNative,
  provider,
}: {
  value: string;
  onChange: (value: string) => void;
  supportsNative: boolean;
  provider: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <SearchOption active={value === "none"} title="Off" description="Generate without search." onClick={() => onChange("none")} />
      <SearchOption
        active={value === "native"}
        disabled={!supportsNative}
        title="Built-in"
        description={supportsNative ? "Model handles search." : `Unavailable for ${providerLabel(provider)}.`}
        onClick={() => onChange("native")}
      />
      <SearchOption active={value === "external"} title="External API" description="Uses the Search tab." onClick={() => onChange("external")} />
    </div>
  );
}

function SearchOption({
  active,
  disabled,
  title,
  description,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-20 rounded-lg border px-3 py-2.5 text-left ${active
          ? "border-accent/60 bg-accent/10 text-foreground"
          : disabled
            ? "border-border/40 bg-surface/20 text-muted/40 cursor-not-allowed"
            : "border-border/60 bg-surface/40 text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed">{description}</span>
    </button>
  );
}
