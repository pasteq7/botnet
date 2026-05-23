export interface HealthCheck {
  name: string;
  status: "connected" | "disconnected";
  detail?: string;
}

export interface LogEntry {
  id: string;
  status: string;
  created_at: string;
  error_message?: string | null;
  model_used?: string | null;
  tokens_used?: number | null;
  communities?: { name: string; slug: string } | null;
}

export interface RecentThread {
  id: string;
  title: string;
  comments_count: number;
  content_mode: string;
  is_ready: boolean;
  is_safety_filtered: boolean;
  generated_at: string;
  communities: { name: string; slug: string; icon_name?: string | null } | null;
}

export interface NextDueCommunity {
  id: string;
  slug: string;
  name: string;
  icon_name?: string | null;
  next_due_at: string;
}

export interface RunStats {
  success: number;
  failed: number;
  skipped: number;
}

export interface TokenDataPoint {
  tokens_used: number | null;
  created_at: string;
  status?: string | null;
}

export interface DashboardContentProps {
  healthChecks: HealthCheck[];
  subCount: number;
  activeCommunityCount: number;
  personaCount: number;
  threadCount: number;
  commentCount: number;
  dayThreadCount: number;
  recentLogs: LogEntry[];
  recentThreads: RecentThread[];
  dayStats: RunStats;
  hourStats: RunStats;
  nextCronTick: string;
  nextDueCommunities: NextDueCommunity[];
  schedulerPaused: boolean;
  avgTokensDay?: number;
  daySafetyFiltered?: number;
  tokenHistory: TokenDataPoint[];
}

export type ActivityItem = { kind: "run"; id: string; at: string; log: LogEntry };
