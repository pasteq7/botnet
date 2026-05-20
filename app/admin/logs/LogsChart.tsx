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
import { RefreshCw } from "lucide-react";
import { getLogsChartData } from "./actions";
import { ACTIVITY_STATUS_ORDER, getStatusStyle } from "@/lib/constants";
import { Loading } from "@/components/ui/Loading";

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

type ChartStatus = keyof Omit<ChartDataPoint, "date">;

const STATUSES = ACTIVITY_STATUS_ORDER satisfies readonly ChartStatus[];

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
  return STATUSES.filter((s) => data.some((d) => d[s] > 0));
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
      className={`flex items-center gap-2 rounded-md border border-border/40 bg-background/25 px-2.5 py-1 text-xs transition-all hover:bg-surface-hover/70 cursor-pointer ${
        isHidden ? "opacity-35" : "opacity-100"
      }`}
      title={`Toggle ${label} visibility`}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium text-muted/90">{label}</span>
      <span className="font-semibold text-foreground">{value.toLocaleString("en-US")}</span>
      <span className="text-[10px] text-muted/60 font-medium">({pct}%)</span>
    </button>
  );
}

const btnCls = "px-2.5 py-1 text-[11px] rounded-md border border-border/40 transition-colors";

export interface LogsChartProps {
  refreshTrigger?: number;
  onRefreshAll?: () => void;
}

export function LogsChart({ refreshTrigger, onRefreshAll }: LogsChartProps) {
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
  }, {} as Record<ChartStatus, number>);
  const grandTotal = STATUSES.reduce((sum, s) => sum + (totals[s] ?? 0), 0);

  const activeStatuses = getActiveStatuses(data);
  const toggleStatus = (s: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { next.delete(s); } else { next.add(s); }
      return next;
    });

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  return (
    <section className="space-y-4 border-b border-border/40 bg-surface px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground/90 tracking-wide">Job Activity</h3>
          <p className="text-xs text-muted/70 mt-0.5">
            {GRANULARITY_RANGES[granularity]}
            {grandTotal > 0 ? ` - ${grandTotal.toLocaleString("en-US")} total` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background rounded-md p-0.5 border border-border/40">
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
          <button
            onClick={onRefreshAll}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/35 px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title="Refresh all activity data"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {!loading && grandTotal > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          {activeStatuses.map((s) => (
            <StatPill
              key={s}
              label={getStatusStyle(s).label}
              value={totals[s] ?? 0}
              color={getStatusStyle(s).color}
              total={grandTotal}
              isHidden={hidden.has(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-[140px]">
          <Loading />
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
              stroke="var(--border)"
              opacity={0.18}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatAxis(v, granularity)}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={granularity === "minute" ? 80 : 40}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)", radius: 4 }}
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
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-error/10 text-error">
                          {fRatio}% failed
                        </span>
                      )}
                    </div>
                    {[...nonZero]
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map((entry) => {
                        const key = entry.dataKey as string;
                        const cfg = getStatusStyle(key);
                        const pct = Math.round(((entry.value as number) / bucketTotal) * 100);
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                              <span className="size-1.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
                              {cfg.label}
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
                  fill={getStatusStyle(s).color}
                  radius={s === activeStatuses.filter(x => !hidden.has(x)).at(-1) ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={40}
                  onMouseEnter={(d) => setHoveredDate(d.payload?.date)}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={getStatusStyle(s).color}
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
    </section>
  );
}
