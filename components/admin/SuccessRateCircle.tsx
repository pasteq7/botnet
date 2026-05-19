"use client";

import { motion } from "framer-motion";

interface SuccessRateCircleProps {
  success: number;
  failed: number;
  skipped: number;
  size?: number;
}

export function SuccessRateCircle({
  success,
  failed,
  skipped,
  size = 160,
}: SuccessRateCircleProps) {
  const total = success + failed + skipped;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
  const hasData = total > 0;

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment lengths
  const successDash = hasData ? (success / total) * circumference : 0;
  const failedDash = hasData ? (failed / total) * circumference : 0;
  const skippedDash = hasData ? (skipped / total) * circumference : 0;

  return (
    <div className="flex w-full flex-col items-center gap-6 p-2">
      <div className="relative max-w-full" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="max-w-full rotate-[-90deg]"
        >
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />

          {/* Success Segment */}
          {hasData && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--success)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${successDash} ${circumference}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          )}

          {/* Failed Segment */}
          {hasData && failed > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--error)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${failedDash} ${circumference}`}
              strokeDashoffset={-successDash}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              strokeLinecap="round"
            />
          )}

          {/* Skipped Segment */}
          {hasData && skipped > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--muted)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${skippedDash} ${circumference}`}
              strokeDashoffset={-(successDash + failedDash)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-light text-foreground"
          >
            {successRate}%
          </motion.span>
          <span className="text-xs uppercase tracking-widest text-muted/90 mt-1 font-medium">Success</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 px-2 sm:gap-4">
        <StatItem label="Success" value={success} color="bg-success" />
        <StatItem label="Failed" value={failed} color="bg-error" />
        <StatItem label="Skipped" value={skipped} color="bg-muted" />
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`size-1.5 rounded-full ${color}`} />
        <span className="text-xs uppercase tracking-tight text-muted/80 font-semibold">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
