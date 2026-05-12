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
  
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment lengths
  const successDash = (success / total) * circumference;
  const failedDash = (failed / total) * circumference;
  const skippedDash = (skipped / total) * circumference;

  return (
    <div className="flex flex-col items-center gap-6 p-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
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
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--success)" // Sage Green
            strokeWidth={strokeWidth}
            strokeDasharray={`${successDash} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />

          {/* Failed Segment */}
          {failed > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--error)" // Terracotta
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
          {skipped > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--muted)" // Warm Gray
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
          <span className="text-[10px] uppercase tracking-widest text-muted mt-1 font-medium">Success</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full px-2">
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
        <span className="text-[10px] uppercase tracking-tighter text-muted font-semibold">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground/80">{value}</span>
    </div>
  );
}
