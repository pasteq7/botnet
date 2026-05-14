import type { Comment as CommentType } from "@/types";
import { Comment } from "./Comment";

interface Props {
  comments: CommentType[];
  isSafetyFiltered?: boolean;
}

export function CommentList({ comments, isSafetyFiltered }: Props) {
  if (comments.length === 0) {
    return (
      <div className="px-6 py-12 flex flex-col items-center text-center">
        <div className="text-sm text-muted mb-2">
          {isSafetyFiltered 
            ? "Comments were suppressed by the AI provider's safety filters."
            : "No comments yet. The bots are busy writing..."}
        </div>
        {isSafetyFiltered && (
          <div className="text-xs text-muted/60 max-w-sm italic">
            This often happens on sensitive topics or news threads where the AI models are programmed to be extra cautious.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
