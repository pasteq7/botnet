"use client";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { RangeToggle, SectionHeader } from "@/app/admin/dashboard/DashboardPrimitives";
import type { RunStats } from "@/app/admin/dashboard/types";

export function ProductionCard({
  range,
  setRange,
  stats,
  className = "",
}: {
  range: "day" | "hour";
  setRange: (range: "day" | "hour") => void;
  stats: RunStats;
  className?: string;
}) {
  const total = stats.success + stats.failed + stats.skipped;
  const successPct = total > 0 ? Math.round((stats.success / total) * 100) : 0;

  return (
    <GlassSurface
      as="section"
      className={`flex flex-col overflow-hidden ${className}`}
    >
      <SectionHeader
        title="Production"
        detail={range === "day" ? "24h" : "1h"}
        action={<RangeToggle range={range} setRange={setRange} />}
      />

      {/* Main body: donut left, stats right */}
      <div className="flex flex-1 items-center gap-6 px-5 py-4">
        <Donut
          success={stats.success}
          failed={stats.failed}
          skipped={stats.skipped}
          successPct={successPct}
          total={total}
        />

        {/* Right column */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">

          {/* Total runs — compact row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
              Total Runs
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-medium tabular-nums text-foreground">
                {total.toLocaleString("en-US")}
              </span>
              {successPct > 90 && (
                <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
                  OK
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-border/10" />

          {/* Outcome pills — slimmer */}
          <div className="grid grid-cols-3 gap-2">
            <OutcomePill label="Success" value={stats.success} total={total} tone="success" />
            <OutcomePill label="Failed" value={stats.failed} total={total} tone="error" />
            <OutcomePill label="Skipped" value={stats.skipped} total={total} tone="warning" />
          </div>

        </div>
      </div>
    </GlassSurface>
  );
}

function Donut({
  success,
  failed,
  skipped,
  successPct,
  total,
}: {
  success: number;
  failed: number;
  skipped: number;
  successPct: number;
  total: number;
}) {
  const radius = 52;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 1 ? 5 : 0;

  const segments = [
    { value: success, color: "var(--success)" },
    { value: failed, color: "var(--error)" },
    { value: skipped, color: "var(--warning)" },
  ].filter((s) => s.value > 0);

  let offset = 0;
  const arcs = segments.map((segment) => {
    const ratio = segment.value / total;
    const dash = Math.max(0, ratio * circumference - gap);
    const arc = {
      dash,
      gap: circumference - dash,
      offset: -offset,
      color: segment.color,
    };
    offset += ratio * circumference;
    return arc;
  });

  // Fixed viewBox size; scale via className
  const vb = 128;

  return (
    <div className="relative size-[152px] shrink-0">
      <svg viewBox={`0 0 ${vb} ${vb}`} className="-rotate-90 size-full">
        {/* Track */}
        <circle
          cx={vb / 2} cy={vb / 2} r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity="0.12"
        />
        {/* Segments */}
        {total > 0 &&
          arcs.map((arc, i) => (
            <circle
              key={i}
              cx={vb / 2} cy={vb / 2} r={radius}
              fill="none"
              stroke={arc.color}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              className="transition-all duration-500 ease-out"
              opacity="0.9"
            />
          ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-medium leading-none tracking-tight text-success">
          {successPct}%
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted/70">
          Success
        </span>
      </div>
    </div>
  );
}

function OutcomePill({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "success" | "error" | "warning";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  const text = {
    success: "text-success/80",
    error: "text-error/80",
    warning: "text-warning/80",
  }[tone];

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/15 bg-background/25 px-2.5 py-2">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/75">
        {label}
      </p>
      <p className={`text-lg font-medium leading-none tabular-nums ${text}`}>
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[11px] font-medium leading-none text-muted/65">
        {pct}%
      </p>
    </div>
  );
}
