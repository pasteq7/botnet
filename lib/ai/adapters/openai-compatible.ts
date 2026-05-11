import type { LLMAdapter, AdapterConfig, RobustGenerateResult } from "./types";

interface Annotation {
  type: string;
  url_citation?: { url: string; title?: string };
}

const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
};

interface OpenAICallResult {
  text: string | null;
  citations?: Array<{ url?: string; title?: string }>;
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  contents: string,
  apiKey: string,
  config: Record<string, unknown> | undefined,
  timeoutMs: number
): Promise<OpenAICallResult | null> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: contents }],
  };

  if (config?.temperature != null) body.temperature = config.temperature;
  if (config?.maxOutputTokens != null) body.max_tokens = config.maxOutputTokens;
  if (config?.top_p != null) body.top_p = config.top_p;
  if (config?.tools != null) body.tools = config.tools;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content?.trim() ?? null;

    const result: OpenAICallResult = { text: content };

    if (message?.citations?.length) {
      result.citations = message.citations;
    } else if (message?.annotations?.length) {
      const urlCitations = (message.annotations as Annotation[]).filter(
        (a) => a.type === "url_citation" && a.url_citation
      );
      if (urlCitations.length > 0) {
        result.citations = urlCitations.map((a) => ({
          url: a.url_citation!.url,
          title: a.url_citation!.title || a.url_citation!.url,
        }));
      }
    }

    return result;
  } finally {
    clearTimeout(timer);
  }
}

const SUPPORTED_MISTRAL_WEB_SEARCH_MODELS = ["mistral-large", "mistral-small", "open-mistral-nemo", "pixtral"];

function resolveSearchConfig(
  provider: string,
  model: string,
  config: Record<string, unknown> | undefined,
  searchEnabled: boolean | undefined
): { model: string; config: Record<string, unknown> | undefined } {
  let resolvedModel = model;
  let resolvedConfig = config ? { ...config } : undefined;

  if (!searchEnabled) return { model: resolvedModel, config: resolvedConfig };

  if (provider === "openrouter") {
    resolvedModel = `${model}:online`;
  } else if (provider === "mistral") {
    resolvedConfig = { ...(resolvedConfig ?? {}), tools: [{ type: "web_search" }] };

    const isSupported = SUPPORTED_MISTRAL_WEB_SEARCH_MODELS.some((m) => resolvedModel.includes(m));
    if (!isSupported) {
      console.warn(
        `[openaiCompatibleAdapter] Mistral model ${resolvedModel} does not support web search. Upgrading to mistral-large-latest.`
      );
      resolvedModel = "mistral-large-latest";
    }
  }

  // Strip googleSearch tools (Gemini-only)
  if (resolvedConfig?.tools) {
    const filtered = (resolvedConfig.tools as { googleSearch?: unknown }[]).filter(
      (t) => !t.googleSearch
    );
    if (filtered.length === 0) {
      resolvedConfig = { ...resolvedConfig };
      delete resolvedConfig.tools;
    } else {
      resolvedConfig = { ...resolvedConfig, tools: filtered };
    }
  }

  return { model: resolvedModel, config: resolvedConfig };
}

export function createOpenAICompatibleAdapter(provider: string): LLMAdapter {
  const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];

  if (!baseUrl) {
    throw new Error(`[openaiCompatibleAdapter] Unknown provider: "${provider}"`);
  }

  return {
    async generate(config: AdapterConfig): Promise<RobustGenerateResult | null> {
      const { model: resolvedModel, config: resolvedConfig } = resolveSearchConfig(
        provider,
        config.model,
        config.config,
        config.searchEnabled
      );

      const result = await callOpenAICompatible(
        baseUrl,
        resolvedModel,
        config.contents,
        config.apiKey,
        resolvedConfig,
        config.timeoutMs
      );

      if (!result?.text) return null;

      const response: RobustGenerateResult = { text: result.text };

      if (config.searchEnabled && result.citations?.length) {
        response.groundingChunks = result.citations.map((c) => ({
          web: { uri: c.url ?? "", title: c.title ?? "" },
        }));
      }

      if (config.searchEnabled && !response.groundingChunks?.length) {
        console.warn(
          `[openaiCompatibleAdapter] Search was enabled for ${provider} but no citations returned — model may be hallucinating`
        );
      }

      return response;
    },
  };
}

const _adapterCache = new Map<string, LLMAdapter>();

export function getOpenAICompatibleAdapter(provider: string): LLMAdapter {
  let adapter = _adapterCache.get(provider);
  if (!adapter) {
    adapter = createOpenAICompatibleAdapter(provider);
    _adapterCache.set(provider, adapter);
  }
  return adapter;
}
