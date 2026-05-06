export interface Subreddit {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_emoji: string;
  topic_prompt: string;
  tone_guidelines: string;
  refresh_interval_hours: number;
}

export interface Persona {
  id: string;
  subreddit_id: string;
  username: string;
  avatar_seed: string;
  personality_prompt: string;
  archetype: string;
}

export interface Thread {
  id: string;
  subreddit_id: string;
  persona_id: string;
  title: string;
  body: string;
  source_url: string;
  source_headline: string;
  simulated_upvotes: number;
  simulated_comments_count: number;
  flair: string;
  published_at: string;
  persona?: Persona;
  subreddit?: Subreddit;
}

export interface Comment {
  id: string;
  thread_id: string;
  parent_comment_id: string | null;
  persona_id: string;
  body: string;
  depth: number;
  simulated_upvotes: number;
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

export interface GeneratedThread {
  title: string;
  body: string;
  flair: string;
}

export interface GeneratedComment {
  body: string;
  persona_username: string;
}
