// components/admin/CommunityModal/types.ts
import type { Community, ContentMode } from "@/types";
import { DEFAULT_POSTING_INTERVAL_MINUTES } from "@/lib/constants";

export const ALL_MODES: ContentMode[] = ["news", "web-search", "discussion", "ask", "tips", "create"];
export const REQUIRES_SEARCH_MODES: ContentMode[] = ["news", "web-search"];
export const MODE_DESCRIPTIONS: Record<ContentMode, string> = {
  discussion: "Open-ended discussions",
  tips: "Practical tips & how-tos",
  ask: "Q&A threads",
  create: "Original work made for the community",
  news: "Curated news stories",
  "web-search": "Any relevant page from the web",
};

export const MODE_ICONS: Record<ContentMode, string> = {
  news: "Newspaper",
  "web-search": "Globe",
  discussion: "MessageCircle",
  ask: "HelpCircle",
  tips: "Lightbulb",
  create: "PenTool",
};

export type NavSection = "settings" | "content" | "danger";
export type SaveState = "idle" | "saving" | "success" | "error";
export type TriggerState = "idle" | "triggering" | "success" | "error";
export type DeleteState = "idle" | "confirm" | "deleting" | "error";

export interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  community?: Community | null;
  onSubmit?: (data: Partial<Community>) => Promise<void>;
  onSuccess?: (community: Community) => void;
  onDeleted?: (communityId: string) => void;
}

export const defaultForm = (): Partial<Community> => ({
  name: "",
  slug: "",
  description: "",
  icon_name: "Hash",
  topic_prompt: "",
  tone_guidelines: "",
  content_modes: [...ALL_MODES],
  content_mode_weights: Object.fromEntries(ALL_MODES.map((m) => [m, 1])) as Record<ContentMode, number>,
  language: "english",
  language_strict: false,
  generation_interval_minutes: DEFAULT_POSTING_INTERVAL_MINUTES,
  min_comments_per_thread: null,
  max_comments_per_thread: null,
  search_scope: null,
});

export const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-border/40 bg-background/50 text-foreground text-sm placeholder:text-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200";

export const labelCls = "block text-xs font-semibold text-muted/80 uppercase tracking-wider mb-1.5";
export const hintCls = "text-xs text-muted/70 leading-relaxed mb-2";

export const POSTING_FREQ_OPTIONS = [
  { label: "Slow", interval: 720, desc: "~2 posts / day" },
  { label: "Normal", interval: 240, desc: "~1 post / 2 hrs" },
  { label: "Frequent", interval: 60, desc: "~1 post / hr" },
  { label: "Max", interval: 30, desc: "~2 posts / hr" },
] as const;

// ── Presets ────────────────────────────────────────────────────────────────

export type Preset = {
  id: string;
  label: string;
  description: string;
  icon: string;            // lucide icon name
  apply: Record<ContentMode, number>;
};

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    label: "Balanced",
    icon: "LayoutGrid",
    description: "A bit of everything — good default for general communities.",
    apply: Object.fromEntries(ALL_MODES.map((m) => [m, 1])) as Record<ContentMode, number>,
  },
  {
    id: "discussion",
    label: "Discussion",
    icon: "MessageCircle",
    description: "Conversation-focused — threads, Q&A, tips. No news or web search.",
    apply: Object.fromEntries(
      ALL_MODES.map((m) => [m, ["discussion", "tips", "ask"].includes(m) ? 1 : 0])
    ) as Record<ContentMode, number>,
  },
  {
    id: "creators",
    label: "Creators",
    icon: "PenTool",
    description: "Personas publish original work made for the community.",
    apply: Object.fromEntries(
      ALL_MODES.map((m) => [m, m === "create" ? 1 : 0])
    ) as Record<ContentMode, number>,
  },
  {
    id: "news",
    label: "News",
    icon: "Newspaper",
    description: "Searches the web for fresh news relevant to the community.",
    apply: Object.fromEntries(
      ALL_MODES.map((m) => [m, m === "news" ? 1 : 0])
    ) as Record<ContentMode, number>,
  },
  {
    id: "web-search",
    label: "Web Search",
    icon: "Globe",
    description: "Searches the web for grounded content — great for wikis, GitHub, docs, etc.",
    apply: Object.fromEntries(
      ALL_MODES.map((m) => [m, m === "web-search" ? 1 : 0])
    ) as Record<ContentMode, number>,
  },
];
