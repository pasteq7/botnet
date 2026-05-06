import { formatUpvotes } from "@/lib/utils";

interface Props {
  upvotes: number;
}

export function VoteDisplay({ upvotes }: Props) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-1 text-xs text-gray-500">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
      <span className="font-bold text-gray-400">{formatUpvotes(upvotes)}</span>
    </div>
  );
}
