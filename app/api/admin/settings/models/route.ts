import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

interface ModelOption {
  id: string;
  label: string;
}

interface GeminiModel {
  name: string;
  displayName?: string;
}

interface OpenAIModel {
  id: string;
}

const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-4-20250514", label: "Claude 4" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { id: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
];

const PROVIDER_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
};

async function fetchGeminiModels(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }
  const data: { models?: GeminiModel[] } = await res.json();
  return (data.models || [])
    .filter((m) => {
      const name = m.name || "";
      return name.startsWith("models/gemini-") || 
             name.startsWith("models/learnlm-") || 
             name.startsWith("models/gemma-");
    })
    .map((m) => ({
      id: m.name.replace("models/", ""),
      label: m.displayName || m.name.replace("models/", ""),
    }));
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }
  const data: { data?: OpenAIModel[] } = await res.json();
  const chatPrefixes = ["gpt-", "o1-", "o3-", "o4-", "chatgpt-"];
  return (data.data || [])
    .filter((m) => chatPrefixes.some((p) => (m.id || "").startsWith(p)))
    .map((m) => ({
      id: m.id,
      label: m.id,
    }));
}

async function fetchOpenAICompatibleModels(baseUrl: string, apiKey: string, provider: string): Promise<ModelOption[]> {
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${provider} API error (${res.status}): ${text}`);
  }
  const data: { data?: OpenAIModel[] } = await res.json();
  return (data.data || []).map((m) => ({
    id: m.id,
    label: m.id,
  }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: { provider: string; api_key?: string; config_id?: string } = await req.json();
    const { provider } = body;
    let api_key = body.api_key;
    const { config_id } = body;

    if (!provider) {
      return NextResponse.json({ error: "Missing provider" }, { status: 400 });
    }

    if (config_id) {
      const { data: config } = await supabase
        .from("ai_configs")
        .select("encrypted_key")
        .eq("id", config_id)
        .single();

      if (!config) {
        return NextResponse.json({ error: "Config not found" }, { status: 404 });
      }

      try {
        api_key = decrypt(config.encrypted_key);
      } catch {
        return NextResponse.json({ error: "Failed to decrypt stored API key" }, { status: 500 });
      }
    }

    if (!api_key) {
      return NextResponse.json({ error: "Missing api_key or config_id" }, { status: 400 });
    }

    let models: ModelOption[];

    switch (provider) {
      case "gemini":
        models = await fetchGeminiModels(api_key);
        break;
      case "openai":
        models = await fetchOpenAIModels(api_key);
        break;
      case "anthropic":
        models = ANTHROPIC_MODELS;
        break;
      case "deepseek":
      case "openrouter":
      case "mistral": {
        const baseUrl = PROVIDER_BASE_URLS[provider];
        if (!baseUrl) {
          return NextResponse.json({ error: `Unknown base URL for ${provider}` }, { status: 500 });
        }
        models = await fetchOpenAICompatibleModels(baseUrl, api_key, provider);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
