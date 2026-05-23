import type { ActivityItem, LogEntry, RecentThread } from "@/app/admin/dashboard/types";

export function buildActivityItems(
  _threads: RecentThread[],
  logs: LogEntry[],
): ActivityItem[] {
  return logs.map((log) => ({
    kind: "run",
    id: `run-${log.id}`,
    at: log.created_at,
    log,
  }));
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
