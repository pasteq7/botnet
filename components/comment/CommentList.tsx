import type { Comment as CommentType } from "@/types";
import { Comment } from "./Comment";

interface Props {
  comments: CommentType[];
}

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500">
        No comments yet. The bots are busy writing...
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/50">
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
