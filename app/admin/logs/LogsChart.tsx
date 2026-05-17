// app/admin/logs/LogsChart.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { getLogsChartData } from "./actions";

interface ChartDataPoint {
  date: string;
  success: number;
  failed: number;
  skipped: number;
  running: number;
  queued: number;
  cancelled: number;
}

type Granularity = "day" | "hour" | "minute";

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Day",
  hour: "Hour",
  minute: "Minute",
};

const GRANULARITY_RANGES: Record<Granularity, string> = {
  day: "Last 30 days",
  hour: "Last 7 days",
  minute: "Last 24 hours",
};

const STATUS_CONFIG: Record<keyof Omit<ChartDataPoint, "date">, { color: string; label: string }> = {
  success: { color: "var(--success)", label: "Success" },
  failed: { color: "var(--error)", label: "Failed" },
  running: { color: "#60a5fa", label: "Running" },
  queued: { color: "var(--warning)", label: "Queued" },
  skipped: { color: "#a78bfa", label: "Skipped" },
  cancelled: { color: "var(--muted)", label: "Cancelled" },
};

// Stack order: most important on bottom so it's easiest to read
const STACK_ORDER: (keyof typeof STATUS_CONFIG)[] = [
  "failed", "running", "queued", "skipped", "cancelled", "success",
];

const STATUSES = Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[];

function parseDate(dateStr: string): Date {
  if (dateStr.length === 10) return new Date(dateStr + "T00:00:00");
  return new Date(dateStr.replace(" ", "T") + ":00");
}

function formatAxis(dateStr: string, granularity: Granularity): string {
  const d = parseDate(dateStr);
  if (granularity === "day")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (granularity === "hour")
    return d.toLocaleTimeString("en-US", { hour: "numeric" });
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatTooltipDate(dateStr: string, granularity: Granularity): string {
  const d = parseDate(dateStr);
  if (granularity === "day")
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (granularity === "hour")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getActiveStatuses(data: ChartDataPoint[]) {
  return STACK_ORDER.filter((s) => data.some((d) => d[s] > 0));
}

function StatPill({
  label,
  value,
  color,
  total,
  isHidden,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
  isHidden: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-1 text-xs transition-all hover:bg-surface-hover/70 cursor-pointer ${
        isHidden ? "opacity-35" : "opacity-100"
      }`}
      title={`Toggle ${label} visibility`}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium text-muted/90">{label}</span>
      <span className="font-semibold text-foreground">{value.toLocaleString()}</span>
      <span className="text-[10px] text-muted/60 font-medium">({pct}%)</span>
    </button>
  );
}

const btnCls = "px-2.5 py-1 text-[11px] rounded-md border border-border/40 transition-colors";

export interface LogsChartProps {
  refreshTrigger?: number;
}

export function LogsChart({ refreshTrigger }: LogsChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (g: Granularity) => {
    const result = await getLogsChartData(g);
    if ("data" in result && result.data) setData(result.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchData(granularity).then(() => setLoading(false));
  }, [granularity, fetchData, refreshTrigger]);

  const totals = data.reduce((acc, d) => {
    for (const s of STATUSES) acc[s] = (acc[s] ?? 0) + d[s];
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = STATUSES.reduce((sum, s) => sum + (totals[s] ?? 0), 0);

  const activeStatuses = getActiveStatuses(data);
  const toggleStatus = (s: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { next.delete(s); } else { next.add(s); }
      return next;
    });

  // Highlight bars where failure rate is high
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-4 space-y-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground/90 tracking-wide">Job Activity</h3>
          <p className="text-xs text-muted/70 mt-0.5">{GRANULARITY_RANGES[granularity]}</p>
        </div>
        <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-border/40">
          {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => { if (g !== granularity) setGranularity(g); }}
              className={`${btnCls} ${granularity === g
                  ? "bg-surface-hover border-accent/40 text-foreground"
                  : "bg-transparent border-transparent text-muted hover:text-foreground"
                }`}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive stat/legend pills */}
      {!loading && grandTotal > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          {activeStatuses.map((s) => (
            <StatPill
              key={s}
              label={STATUS_CONFIG[s].label}
              value={totals[s] ?? 0}
              color={STATUS_CONFIG[s].color}
              total={grandTotal}
              isHidden={hidden.has(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-[140px]">
          <div className="size-5 border-2 border-border/60 border-t-accent rounded-full animate-spin" />
        </div>
      ) : !data.length ? (
        <div className="flex items-center justify-center h-[140px] text-sm text-muted">
          No data available for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            barCategoryGap="20%"
            onMouseLeave={() => setHoveredDate(null)}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatAxis(v, granularity)}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={granularity === "minute" ? 80 : 40}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)", radius: 4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const nonZero = payload.filter((e) => (e.value as number) > 0);
                if (!nonZero.length) return null;
                const bucketTotal = nonZero.reduce((s, e) => s + (e.value as number), 0);
                const failedEntry = payload.find((e) => e.dataKey === "failed");
                const failedVal = (failedEntry?.value as number) ?? 0;
                const fRatio = bucketTotal > 0 ? Math.round((failedVal / bucketTotal) * 100) : 0;
                return (
                  <div className="rounded-lg border border-border/60 bg-surface shadow-lg px-3 py-2 text-xs space-y-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-4 pb-1 border-b border-border/30">
                      <p className="text-muted font-medium">
                        {formatTooltipDate(typeof label === "string" ? label : "", granularity)}
                      </p>
                      {fRatio > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          {fRatio}% failed
                        </span>
                      )}
                    </div>
                    {[...nonZero]
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map((entry) => {
                        const key = entry.dataKey as string;
                        const cfg = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG];
                        const pct = Math.round(((entry.value as number) / bucketTotal) * 100);
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: cfg?.color }}>
                              <span className="size-1.5 rounded-sm" style={{ backgroundColor: cfg?.color }} />
                              {cfg?.label ?? key}
                            </span>
                            <span className="text-foreground font-semibold">
                              {entry.value}
                              <span className="text-muted font-normal ml-1">({pct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    <div className="flex items-center justify-between pt-1 border-t border-border/30 text-muted">
                      <span>Total</span>
                      <span className="font-semibold text-foreground">{bucketTotal}</span>
                    </div>
                  </div>
                );
              }}
            />
            {activeStatuses
              .filter((s) => !hidden.has(s))
              .map((s) => (
                <Bar
                  key={s}
                  dataKey={s}
                  stackId="a"
                  fill={STATUS_CONFIG[s].color}
                  radius={s === activeStatuses.filter(x => !hidden.has(x)).at(-1) ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={40}
                  onMouseEnter={(d) => setHoveredDate(d.payload?.date)}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={STATUS_CONFIG[s].color}
                      opacity={
                        hoveredDate === null || hoveredDate === entry.date ? 1 : 0.4
                      }
                    />
                  ))}
                </Bar>
              ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}