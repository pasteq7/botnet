import { timeAgo } from "@/lib/utils";

interface Props {
  dateStr: string;
}

export function FreshnessBadge({ dateStr }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
      {timeAgo(dateStr)}
    </span>
  );
}
