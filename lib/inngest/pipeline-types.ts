import type { Community, Persona, ContentPayload, GeneratedThread, SearchResult } from "@/types";
import type { ResolvedPipelineConfig } from "@/lib/ai/config-types";

export interface PipelineSetup {
  community: Community;
  personas: Persona[];
  localHeadlines: string[];
  globalUrls: string[];
  pipelineConfig: ResolvedPipelineConfig;
}

export interface PipelineSearchResult {
  results: SearchResult[];
  query: string | null;
  strategy: "injected" | "none";
}

export interface PipelineContentResult {
  payload: ContentPayload | null;
  error: string | null;
  tokensUsed: number;
}

export interface PipelineConversation {
  threadContent: GeneratedThread;
  commentChain: Array<{ persona: Persona; body: string; parentIndex: number | null }>;
  tokensUsed: number;
}
