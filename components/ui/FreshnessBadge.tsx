import { timeAgo } from "@/lib/utils";

interface Props {
  dateStr: string;
}

export function FreshnessBadge({ dateStr }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-green-900/30 px-1.5 py-0.5 text-xs text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Updated {timeAgo(dateStr)}
    </span>
  );
}
