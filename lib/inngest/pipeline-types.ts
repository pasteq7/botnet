import type { Community, Persona, ContentPayload, GeneratedThread, SearchResult, RecentCommunityCoverage } from "@/types";
import type { ResolvedPipelineConfig } from "@/lib/ai/config-types";

export interface PipelineSetup {
  community: Community;
  personas: Persona[];
  localHeadlines: string[];
  recentSourceUrls: string[];
  recentCoverage: RecentCommunityCoverage[];
  pipelineConfig: ResolvedPipelineConfig;
  commentRange: {
    min: number;
    max: number;
  };
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
  rawResponse?: string;
}

export interface PipelineConversation {
  threadContent: GeneratedThread;
  commentChain: Array<{ persona: Persona; body: string; parentIndex: number | null }>;
  isSafetyFiltered?: boolean;
  tokensUsed: number;
}
