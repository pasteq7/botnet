"use client";

import type { ReactNode } from "react";

export function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/15 px-4">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-[13px] font-semibold uppercase tracking-[0.18em] text-foreground/85">
          {title}
        </h2>
        <span className="truncate text-xs font-medium text-muted/65">{detail}</span>
      </div>
      {action}
    </div>
  );
}

export function RangeToggle({
  range,
  setRange,
}: {
  range: "day" | "hour";
  setRange: (range: "day" | "hour") => void;
}) {
  return (
    <div className="flex rounded-md border border-border/20 bg-background/20 p-0.5">
      {(["day", "hour"] as const).map((value) => (
        <button
          key={value}
          onClick={() => setRange(value)}
          className={`h-7 rounded px-3 text-xs font-semibold transition-all duration-200 ${
            range === value
              ? "bg-surface-hover/90 text-foreground"
              : "text-muted/65 hover:text-foreground/85"
          }`}
        >
          {value === "day" ? "24h" : "1h"}
        </button>
      ))}
    </div>
  );
}
