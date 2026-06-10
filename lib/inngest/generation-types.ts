import type { Community, Persona, ContentPayload, GeneratedThread, SearchResult, RecentCommunityCoverage } from "@/types";
import type { ResolvedGenerationConfig } from "@/lib/ai/config-types";

export interface GenerationSetup {
  community: Community;
  personas: Persona[];
  localHeadlines: string[];
  recentSourceUrls: string[];
  recentCoverage: RecentCommunityCoverage[];
  generationConfig: ResolvedGenerationConfig;
  commentRange: {
    min: number;
    max: number;
  };
}

export interface GenerationSearchResult {
  results: SearchResult[];
  query: string | null;
  strategy: "injected" | "none";
}

export interface GenerationContentResult {
  payload: ContentPayload | null;
  error: string | null;
  tokensUsed: number;
  rawResponse?: string;
}

export interface GeneratedConversation {
  threadContent: GeneratedThread;
  commentChain: Array<{ persona: Persona; body: string; parentIndex: number | null }>;
  isSafetyFiltered?: boolean;
  tokensUsed: number;
}
