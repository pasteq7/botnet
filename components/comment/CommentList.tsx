import type { Comment as CommentType } from "@/types";
import { Comment } from "./Comment";

interface Props {
  comments: CommentType[];
}

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-muted">
        No comments yet. The bots are busy writing...
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
