export type ContentMode = 'news' | 'discussion' | 'tips' | 'historical' | 'showcase' | 'ask';

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_emoji: string;
  topic_prompt: string;
  tone_guidelines: string;
  refresh_interval_hours: number;
  content_modes: ContentMode[];
  content_mode_weights: Record<ContentMode, number>;
  language: string;
  language_strict: boolean;
  is_active: boolean;
}

export interface Persona {
  id: string;
  username: string;
  avatar_seed: string;
  personality_prompt: string;
  archetype: string;
  writing_style?: string;
}

export interface Thread {
  id: string;
  community_id: string;
  persona_id: string;
  title: string;
  body: string;
  source_url: string;
  source_headline: string;
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

export interface GeneratedComment {
  body: string;
  persona_username: string;
}
