"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Check, ChevronDown, Cpu } from "lucide-react";

import { GlassSurface } from "@/components/ui/GlassSurface";
import type { TokenDataPoint } from "@/app/admin/dashboard/types";
import { formatNumber } from "@/app/admin/dashboard/utils";

type ActivityMetric = "tokens" | "runs" | "avgTokens" | "failed";

const ACTIVITY_METRICS: Record<
  ActivityMetric,
  {
    label: string;
    subtitle: string;
    shortUnit: string;
    tooltipUnit: string;
    stroke: string;
  }
> = {
  tokens: {
    label: "Total tokens",
    subtitle: "Last 24h token usage",
    shortUnit: "tkn",
    tooltipUnit: "tokens",
    stroke: "var(--accent)",
  },
  runs: {
    label: "Generation runs",
    subtitle: "Last 24h run volume",
    shortUnit: "runs",
    tooltipUnit: "runs",
    stroke: "var(--success)",
  },
  avgTokens: {
    label: "Avg tokens / run",
    subtitle: "Token intensity by hour",
    shortUnit: "avg",
    tooltipUnit: "avg tokens",
    stroke: "var(--warning)",
  },
  failed: {
    label: "Failed runs",
    subtitle: "Last 24h failures",
    shortUnit: "fail",
    tooltipUnit: "failed runs",
    stroke: "var(--error)",
  },
};

export function TokenUsageChart({
  tokenHistory,
  mounted,
  className = "",
}: {
  tokenHistory: TokenDataPoint[];
  mounted: boolean;
  className?: string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: number;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [metric, setMetric] = useState<ActivityMetric>("tokens");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedMetric = ACTIVITY_METRICS[metric];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, index) => {
      // eslint-disable-next-line react-hooks/purity
      const date = new Date(Date.now() - (23 - index) * 60 * 60 * 1000);
      return {
        hourLabel: date.toLocaleTimeString("en-US", { hour: "numeric" }),
        tokens: 0,
        tokenRuns: 0,
        runs: 0,
        failed: 0,
        timestamp: date.getTime(),
      };
    });

    tokenHistory.forEach((log) => {
      const logTime = new Date(log.created_at).getTime();
      let bestBucket = buckets[0];
      let minDiff = Math.abs(logTime - buckets[0].timestamp);

      for (let index = 1; index < buckets.length; index += 1) {
        const diff = Math.abs(logTime - buckets[index].timestamp);
        if (diff < minDiff) {
          minDiff = diff;
          bestBucket = buckets[index];
        }
      }

      if (minDiff < 60 * 60 * 1000) {
        bestBucket.tokens += log.tokens_used ?? 0;
        bestBucket.runs += 1;
        if ((log.tokens_used ?? 0) > 0) {
          bestBucket.tokenRuns += 1;
        }
        if (log.status === "failed") {
          bestBucket.failed += 1;
        }
      }
    });

    return buckets.map((bucket) => ({
      label: bucket.hourLabel,
      value:
        metric === "tokens"
          ? bucket.tokens
          : metric === "runs"
            ? bucket.runs
            : metric === "avgTokens"
              ? bucket.tokenRuns > 0
                ? Math.round(bucket.tokens / bucket.tokenRuns)
                : 0
              : bucket.failed,
    }));
  }, [metric, tokenHistory]);

  const selectedTotal = useMemo(
    () => hourlyData.reduce((sum, data) => sum + data.value, 0),
    [hourlyData],
  );

  const maxVal = useMemo(() => {
    const max = Math.max(...hourlyData.map((data) => data.value), 0);
    return max > 0 ? max * 1.15 : metric === "tokens" || metric === "avgTokens" ? 1000 : 10;
  }, [hourlyData, metric]);

  const svgWidth = 600;
  const svgHeight = 120;
  const paddingX = 20;
  const paddingY = 15;

  const points = useMemo(() => {
    const chartWidth = svgWidth - paddingX * 2;
    const chartHeight = svgHeight - paddingY * 2;

    return hourlyData.map((data, index) => {
      const x = paddingX + (index / 23) * chartWidth;
      const y = svgHeight - paddingY - (data.value / maxVal) * chartHeight;
      return { x, y, label: data.label, value: data.value };
    });
  }, [hourlyData, maxVal]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((path, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
    }, "");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const start = `M ${points[0].x} ${svgHeight - paddingY}`;
    const line = points.reduce((path, point) => `${path} L ${point.x} ${point.y}`, start);
    return `${line} L ${points[points.length - 1].x} ${svgHeight - paddingY} Z`;
  }, [points]);

  return (
    <GlassSurface
      className={`relative flex min-h-[188px] flex-col overflow-hidden bg-surface/20 p-4 transition-colors duration-300 hover:bg-surface/25 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-surface/50 shadow-inner">
            <Cpu className="size-3.5 text-accent/80" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold uppercase leading-none tracking-[0.16em] text-foreground/85">
              Token Activity
            </h3>
            <p className="mt-1 text-xs font-medium text-muted/70">
              {selectedMetric.subtitle}
              {selectedTotal > 0 ? ` - ${formatNumber(selectedTotal)} ${selectedMetric.shortUnit}` : ""}
            </p>
          </div>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex w-[158px] items-center justify-between gap-2 rounded-md border border-border/50 bg-background/35 px-2.5 py-1.5 text-left text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/30"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-label="Choose token activity graph"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Activity className="size-3.5 shrink-0 text-muted" />
              <span className="truncate">{selectedMetric.label}</span>
            </span>
            <ChevronDown className={`size-3.5 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full z-40 mt-1 w-[190px] overflow-hidden rounded-md border border-border/60 bg-surface shadow-lg"
              role="listbox"
            >
              {(Object.keys(ACTIVITY_METRICS) as ActivityMetric[]).map((option) => {
                const active = option === metric;
                const config = ACTIVITY_METRICS[option];

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setMetric(option);
                      setHoveredPoint(null);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-accent/10 text-foreground"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="truncate">{config.label}</span>
                    {active && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-[120px] flex-1">
        {mounted ? (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={selectedMetric.stroke} stopOpacity="0.25" />
                <stop offset="100%" stopColor={selectedMetric.stroke} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[paddingY, svgHeight / 2, svgHeight - paddingY].map((y, index) => (
              <line
                key={y}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeDasharray={index < 2 ? "2 3" : undefined}
                opacity={index === 0 ? 0.15 : index === 1 ? 0.1 : 0.2}
              />
            ))}

            <path d={areaPath} fill="url(#chartGradient)" />
            <path
              d={linePath}
              fill="none"
              stroke={selectedMetric.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />

            {points.map((point, index) => {
              const isHovered = hoveredPoint?.label === point.label;

              return (
                <g key={`${point.label}-${index}`}>
                  {isHovered && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={4}
                      className="transition-all duration-150"
                      fill={selectedMetric.stroke}
                      stroke="var(--background)"
                      strokeWidth={1.5}
                      opacity={1}
                    />
                  )}

                  <rect
                    x={point.x - (svgWidth - paddingX * 2) / 46}
                    y={0}
                    width={(svgWidth - paddingX * 2) / 23}
                    height={svgHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        label: point.label,
                        value: point.value,
                        xPct: (point.x / svgWidth) * 100,
                        yPct: (point.y / svgHeight) * 100,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-medium text-muted/70">Loading telemetry...</span>
          </div>
        )}

        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[115%] rounded-lg border border-border/15 bg-surface/90 px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur-md"
            style={{ left: `${hoveredPoint.xPct}%`, top: `${hoveredPoint.yPct}%` }}
          >
            <p className="font-semibold leading-none text-foreground">
              {formatNumber(hoveredPoint.value)}{" "}
              <span className="text-[10px] text-muted/70">{selectedMetric.shortUnit}</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium leading-none text-muted/75">
              {hoveredPoint.label} - {selectedMetric.tooltipUnit}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between px-2 font-mono text-[11px] font-medium text-muted/65">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </GlassSurface>
  );
}
