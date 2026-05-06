import type { Comment as CommentType } from "@/types";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { timeAgo } from "@/lib/utils";

interface Props {
  comment: CommentType;
}

export function Comment({ comment }: Props) {
  return (
    <div className="flex gap-2 py-3">
      <div className="mt-1 shrink-0">
        {comment.persona && (
          <PersonaAvatar seed={comment.persona.avatar_seed} size="sm" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted">
          {comment.persona && (
            <span className="font-medium text-muted">
              {comment.persona.username}
            </span>
          )}
          <span>{timeAgo(comment.created_at)}</span>
        </div>
        <p className="mt-1 text-sm text-foreground leading-relaxed">
          {comment.body}
        </p>
        <div className="mt-1 text-xs text-muted">
          {comment.simulated_upvotes} upvotes
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-2 mt-1 border-l-2 border-border pl-4">
            {comment.replies.map((reply) => (
              <Comment key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
