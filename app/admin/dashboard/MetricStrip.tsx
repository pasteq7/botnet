"use client";

import type { ReactNode } from "react";
import { Cpu, Globe, MessageSquare, ScrollText, Sparkles } from "lucide-react";

import { formatNumber } from "@/app/admin/dashboard/utils";

export function MetricStrip({
  communities,
  activeCommunities,
  threads,
  todayThreads,
  comments,
  avgComments,
  personas,
  totalTokens24h,
  avgTokensDay,
}: {
  communities: number;
  activeCommunities: number;
  threads: number;
  todayThreads: number;
  comments: number;
  avgComments: string;
  personas: number;
  totalTokens24h: number;
  avgTokensDay: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/10 bg-border/8 md:grid-cols-5">
      <MetricCell
        label="Communities"
        value={communities}
        sub={`${activeCommunities} active`}
        icon={<Globe className="size-4 text-muted/65" />}
      />
      <MetricCell
        label="Threads"
        value={threads}
        sub={`+${todayThreads} today`}
        icon={<ScrollText className="size-4 text-muted/65" />}
      />
      <MetricCell
        label="Comments"
        value={comments}
        sub={`${avgComments}/thread`}
        icon={<MessageSquare className="size-4 text-muted/65" />}
      />
      <MetricCell
        label="Personas"
        value={personas}
        sub="available voices"
        icon={<Sparkles className="size-4 text-muted/65" />}
      />
      <MetricCell
        label="Tokens"
        value={totalTokens24h}
        sub={`${formatNumber(avgTokensDay)} avg/run`}
        icon={<Cpu className="size-4 text-muted/65" />}
      />
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative min-w-0 bg-surface/40 px-4 py-3.5 backdrop-blur-sm sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 truncate text-3xl font-medium leading-none tracking-tight text-foreground sm:text-[2rem]">
        {value.toLocaleString("en-US")}
      </p>
      <p className="mt-1.5 truncate text-xs font-medium text-muted/70">{sub}</p>
    </div>
  );
}
