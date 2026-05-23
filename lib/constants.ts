export interface StatusStyle {
  text: string;
  ring: string;
  dot: string;
  color: string;
  label: string;
}

export const STATUS_CONFIG: Record<string, StatusStyle> = {
  success: { text: "text-success", ring: "ring-success/20", dot: "bg-success", color: "var(--success)", label: "Success" },
  completed: { text: "text-success", ring: "ring-success/20", dot: "bg-success", color: "var(--success)", label: "Completed" },
  failed: { text: "text-error", ring: "ring-error/20", dot: "bg-error", color: "var(--error)", label: "Failed" },
  skipped: { text: "text-warning", ring: "ring-warning/20", dot: "bg-warning", color: "var(--warning)", label: "Skipped" },
  running: { text: "text-accent", ring: "ring-accent/20", dot: "bg-accent", color: "var(--accent)", label: "Running" },
  queued: { text: "text-pending", ring: "ring-pending/20", dot: "bg-pending", color: "var(--pending)", label: "Queued" },
  cancelled: { text: "text-muted", ring: "ring-border/60", dot: "bg-muted", color: "var(--muted)", label: "Cancelled" },
};

export const ACTIVITY_STATUS_ORDER = ["failed", "running", "queued", "skipped", "cancelled", "success"] as const;
export const ACTIVITY_STATUS_FILTERS = ["success", "failed", "skipped", "running", "queued", "cancelled"] as const;

export const DEFAULT_POSTING_INTERVAL_MINUTES = 240;
export const COMMUNITY_CRON_INTERVAL_MINUTES = 30;
export const COMMUNITY_CRON_EXPRESSION = `*/${COMMUNITY_CRON_INTERVAL_MINUTES} * * * *`;
export const DEFAULT_MAX_THREADS_PER_TICK = 3;
export const MAX_THREADS_PER_TICK = 10;
export const DEFAULT_MIN_COMMENTS_PER_THREAD = 4;
export const DEFAULT_MAX_COMMENTS_PER_THREAD = 8;
export const MAX_COMMENTS_PER_THREAD = 100;
export const DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED = false;
export const DEFAULT_BACKGROUND_IMAGE_ENABLED = true;
export const MAX_BACKGROUND_IMAGE_BYTES = 300 * 1024;
export const ALLOWED_BACKGROUND_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const INTERFACE_ASSETS_BUCKET = "interface-assets";

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_CONFIG[status?.toLowerCase()] ?? {
    text: "text-muted", ring: "ring-border", dot: "bg-border", color: "var(--border)", label: status || "Unknown",
  };
}
