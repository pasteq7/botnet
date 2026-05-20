import {
  COMMUNITY_CRON_INTERVAL_MINUTES,
  DEFAULT_MAX_THREADS_PER_TICK,
  DEFAULT_POSTING_INTERVAL_MINUTES,
  MAX_THREADS_PER_TICK,
} from "@/lib/constants";

export interface SchedulerConfigInput {
  max_per_run?: number | null;
  default_interval_minutes?: number | null;
  is_active?: boolean | null;
}

export interface CommunityScheduleInput {
  generation_interval_minutes?: number | null;
  last_generated_at?: string | null;
}

export interface EffectiveSchedulerConfig {
  maxPerRun: number;
  defaultIntervalMinutes: number;
  isActive: boolean;
}

export function getEffectiveSchedulerConfig(config?: SchedulerConfigInput | null): EffectiveSchedulerConfig {
  return {
    maxPerRun: Math.min(config?.max_per_run ?? DEFAULT_MAX_THREADS_PER_TICK, MAX_THREADS_PER_TICK),
    defaultIntervalMinutes: config?.default_interval_minutes ?? DEFAULT_POSTING_INTERVAL_MINUTES,
    isActive: config?.is_active ?? true,
  };
}

export function getNextCommunityCronTick(from = new Date()): Date {
  const intervalMs = COMMUNITY_CRON_INTERVAL_MINUTES * 60_000;
  const time = from.getTime();
  return new Date(Math.ceil(time / intervalMs) * intervalMs);
}

export function getCommunityNextDueAt(
  community: CommunityScheduleInput,
  defaultIntervalMinutes: number,
): Date {
  const intervalMinutes = community.generation_interval_minutes ?? defaultIntervalMinutes;
  const lastGeneratedAt = community.last_generated_at ? new Date(community.last_generated_at).getTime() : 0;
  return new Date(lastGeneratedAt + intervalMinutes * 60_000);
}

export function getDueCommunitiesAt<T extends CommunityScheduleInput>(
  communities: T[],
  config: SchedulerConfigInput | null | undefined,
  at: Date,
): Array<T & { next_due_at: string }> {
  const effective = getEffectiveSchedulerConfig(config);
  if (!effective.isActive || effective.maxPerRun <= 0) return [];

  const dueAtTime = at.getTime();

  return communities
    .map((community) => ({
      ...community,
      next_due_at: getCommunityNextDueAt(community, effective.defaultIntervalMinutes).toISOString(),
    }))
    .filter((community) => new Date(community.next_due_at).getTime() <= dueAtTime)
    .sort((a, b) => {
      const aLast = a.last_generated_at ? new Date(a.last_generated_at).getTime() : 0;
      const bLast = b.last_generated_at ? new Date(b.last_generated_at).getTime() : 0;
      return aLast - bLast;
    })
    .slice(0, effective.maxPerRun);
}
