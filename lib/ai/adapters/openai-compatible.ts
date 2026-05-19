// lib\ai\adapters\openai-compatible.ts
import type { LLMAdapter, AdapterConfig, RobustGenerateResult } from "./types";
import { resolveAdapterSearchConfig } from "./search-resolver";
import { fetchWithTimeout } from "@/lib/ai/fetch-utils";

interface Annotation {
  type: string;
  url_citation?: { url: string; title?: string };
}

const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
};

interface OpenAICallResult {
  text: string | null;
  error?: string;
  citations?: Array<{ url?: string; title?: string }>;
  tokensUsed?: number;
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  contents: string,
  apiKey: string,
  config: Record<string, unknown> | undefined,
  timeoutMs: number,
  provider: string,
  endpoint?: string
): Promise<OpenAICallResult | null> {
  const resolvedEndpoint = endpoint ?? "/chat/completions";
  const isMistralWebSearch = resolvedEndpoint === "/conversations";

  const body: Record<string, unknown> = {
    model,
  };

  // The Conversations API uses 'inputs' and accepts sampling params inside 'completion_args'
  if (isMistralWebSearch) {
    body.inputs = [{ role: "user", content: contents }];
    if (config?.temperature != null || config?.maxOutputTokens != null || config?.top_p != null) {
      const completionArgs: Record<string, unknown> = {};
      if (config?.temperature != null) completionArgs.temperature = config.temperature;
      if (config?.maxOutputTokens != null) completionArgs.max_tokens = config.maxOutputTokens;
      if (config?.top_p != null) completionArgs.top_p = config.top_p;
      body.completion_args = completionArgs;
    }
  } else {
    body.messages = [{ role: "user", content: contents }];
    if (config?.temperature != null) body.temperature = config.temperature;
    if (config?.maxOutputTokens != null) body.max_tokens = config.maxOutputTokens;
    if (config?.top_p != null) body.top_p = config.top_p;
  }

  if (config?.tools != null) body.tools = config.tools;

  const response = await fetchWithTimeout(
    `${baseUrl}${resolvedEndpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
    `${provider} ${model} request failed`
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(`${response.status}: ${text.slice(0, 200)}`);
    (err as unknown as { status: number }).status = response.status;
    throw err;
  }

  const data = await response.json();

    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error.message ?? JSON.stringify(data.error);
      return { text: null, error: errMsg };
    }

    // Safely extract message depending on whether it's Chat Completions, Agents API, or Conversations API
    let message = data.choices?.[0]?.message;
    if (!message && data.messages && Array.isArray(data.messages)) {
      message = data.messages[data.messages.length - 1];
    } else if (!message && data.message) {
      message = data.message;
    } else if (!message && data.output) {
      // In case the response directly places output at root
      message = { content: data.output };
    }

    let content = null;
    const citationsArray: Array<{ url?: string; title?: string }> = [];

    const messageContent = message?.content ?? message?.output;

    // Extract content chunks properly depending on whether model natively injects tool references
    if (Array.isArray(messageContent)) {
      const textChunks = [];
      for (const chunk of messageContent) {
        if (typeof chunk === "string") {
          textChunks.push(chunk);
        } else if (chunk.type === "text" || chunk.text != null || chunk.content != null) {
          const t = chunk.text ?? chunk.content ?? "";
          if (t) textChunks.push(t);
        }

        if (chunk.type === "tool_reference" || chunk.url) {
          // Mistral places web search results as tool_reference chunks in the response body
          citationsArray.push({ url: chunk.url, title: chunk.title || chunk.url });
        }
      }
      content = textChunks.join("").trim();
    } else if (typeof messageContent === "string") {
      content = messageContent.trim();
    }

    const result: OpenAICallResult = {
      text: content || null,
      tokensUsed: data.usage?.total_tokens
    };
    if (!content) {
      result.error = "Empty response content from AI provider";
    }

    // Standard OpenRouter and OpenAI compatible citations
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

    // Include native Mistral web search tool_references found in content chunks
    if (citationsArray.length > 0) {
      if (!result.citations) result.citations = [];
      result.citations.push(...citationsArray);
    }

  return result;
}

export function createOpenAICompatibleAdapter(provider: string): LLMAdapter {
  const defaultBaseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider] ?? null;

  return {
    async generate(config: AdapterConfig): Promise<RobustGenerateResult | null> {
      const baseUrl = config.baseUrl ?? defaultBaseUrl;
      if (!baseUrl) {
        throw new Error(
          `[openaiCompatibleAdapter] No base URL for provider "${provider}". Provide a base_url in the config or select a known provider.`
        );
      }

      const { model: resolvedModel, config: resolvedConfig, endpoint, isSearchEnabled } = resolveAdapterSearchConfig(
        provider,
        config.model,
        config.searchMode,
        config.searchEnabled,
        config.config
      );

      const effectiveEndpoint = endpoint ?? (
        provider === "mistral" && isSearchEnabled ? "/conversations" : "/chat/completions"
      );

      const result = await callOpenAICompatible(
        baseUrl,
        resolvedModel,
        config.contents,
        config.apiKey,
        resolvedConfig,
        config.timeoutMs,
        provider,
        effectiveEndpoint
      );

      if (result?.error) return { text: "", error: result.error };
      if (!result?.text) return null;

      const response: RobustGenerateResult = {
        text: result.text,
        tokensUsed: result.tokensUsed
      };

      if (isSearchEnabled && result.citations?.length) {
        response.groundingChunks = result.citations.map((c) => ({
          web: { uri: c.url ?? "", title: c.title ?? "" },
        }));
      }

      if (isSearchEnabled && !response.groundingChunks?.length) {
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
