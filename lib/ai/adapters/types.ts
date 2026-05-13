import type { RequestTier } from "../reliability";

export interface GroundingChunk {
  web?: { uri: string; title: string };
}

export interface RobustGenerateResult {
  text: string;
  error?: string;
  groundingChunks?: GroundingChunk[];
  searchQueries?: string[];
  modelUsed?: string;
  tokensUsed?: number;
}

export interface AdapterConfig {
  contents: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs: number;
  config?: Record<string, unknown>;
  searchEnabled?: boolean;
  tier?: RequestTier;
  maxRetries?: number;
}

export interface LLMAdapter {
  generate(config: AdapterConfig): Promise<RobustGenerateResult | null>;
}
