export interface StatusStyle {
  text: string;
  ring: string;
  dot: string;
  label: string;
}

export const STATUS_CONFIG: Record<string, StatusStyle> = {
  success: { text: "text-success", ring: "ring-success/20", dot: "bg-success", label: "Success" },
  completed: { text: "text-success", ring: "ring-success/20", dot: "bg-success", label: "Completed" },
  failed: { text: "text-error", ring: "ring-error/20", dot: "bg-error", label: "Failed" },
  skipped: { text: "text-warning", ring: "ring-warning/20", dot: "bg-warning", label: "Skipped" },
  running: { text: "text-warning", ring: "ring-warning/20", dot: "bg-warning", label: "Running" },
  queued: { text: "text-pending", ring: "ring-pending/20", dot: "bg-pending", label: "Queued" },
  cancelled: { text: "text-muted", ring: "ring-border/60", dot: "bg-muted", label: "Cancelled" },
};

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_CONFIG[status?.toLowerCase()] ?? {
    text: "text-muted", ring: "ring-border", dot: "bg-border", label: status || "Unknown",
  };
}
