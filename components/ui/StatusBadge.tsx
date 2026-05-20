import { getStatusStyle } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  const isRunning = status === "running";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${style.text} ${style.ring}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${isRunning ? "animate-pulse" : ""}`} />}
      {style.label}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return <span className={`size-2 rounded-full ${style.dot}`} />;
}
