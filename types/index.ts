export type ContentMode = 'news' | 'discussion' | 'tips' | 'historical' | 'showcase' | 'ask' | 'web-search';

export type AiPurpose = 'any' | 'search' | 'generation';

export type PersonaScope = 'global' | 'scoped';

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_name: string;
  topic_prompt: string;
  tone_guidelines: string;
  content_modes: ContentMode[];
  content_mode_weights: Record<ContentMode, number>;
  language: string;
  language_strict: boolean;
  threads_per_hour?: number | null;
  is_active: boolean;
}

export interface PersonaCommunity {
  persona_id: string;
  community_id: string;
  communities?: Pick<Community, 'id' | 'name' | 'slug'>;
}

export interface Persona {
  id: string;
  username: string;
  avatar_seed: string;
  personality_prompt: string;
  archetype: string;
  writing_style?: string;
  scope: PersonaScope;
  persona_communities?: PersonaCommunity[];
}

export interface Thread {
  id: string;
  community_id: string;
  persona_id: string;
  title: string;
  body: string;
  source_url: string | null;
  source_headline: string | null;
  comments_count: number;
  flair: string;
  published_at: string;
  content_mode: ContentMode;
  persona?: Persona;
  community?: Community;
}

export interface Comment {
  id: string;
  thread_id: string;
  parent_comment_id: string | null;
  persona_id: string;
  body: string;
  depth: number;
  created_at: string;
  persona?: Persona;
  replies?: Comment[];
}

export interface NewsStory {
  headline: string;
  summary: string;
  url: string;
  angle: string;
  why_interesting: string;
}

export interface ContentPayload extends Partial<NewsStory> {
  mode: ContentMode;
  headline: string;
  summary: string;
  angle: string;
  why_interesting: string;
  url?: string;
}

export interface GeneratedThread {
  title: string;
  body: string;
  flair: string;
}

// --- Activity Log Types ---

export interface ActivityLog {
  id: string;
  community_id: string;
  community_name: string | null;
  community_slug: string | null;
  thread_id: string | null;
  status: string;
  model_used: string | null;
  model_search: string | null;
  model_gen: string | null;
  tokens_used: number | null;
  error_message: string | null;
  created_at: string;
}

export interface StepTrace {
  id: string;
  name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  output?: string;
  error?: string;
}

export interface TraceEntry {
  step: string;
  status: "success" | "failed" | "skipped";
  message: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
  model?: string;
  timestamp?: string;
}

export interface ActivityLogDetails extends ActivityLog {
  steps?: StepTrace[];
  trace?: TraceEntry[];
  inngest_event_id?: string;
}

