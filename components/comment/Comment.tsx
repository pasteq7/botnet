import { User } from "lucide-react";
import type { Comment as CommentType } from "@/types";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { timeAgo } from "@/lib/utils";

interface Props {
  comment: CommentType;
}

export function Comment({ comment }: Props) {
  const isDeleted = !comment.persona;

  return (
    <div className="flex gap-4 py-5 first:pt-0">
      <div className="shrink-0 mt-1">
        {isDeleted ? (
          <div className="size-5 rounded-full bg-muted/20 flex items-center justify-center">
            <User className="size-3 text-muted/40" />
          </div>
        ) : (
          <PersonaAvatar seed={comment.persona?.avatar_seed ?? ""} size="sm" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-muted mb-2">
          {isDeleted ? (
            <span className="font-bold text-muted/40 tracking-wide uppercase text-[10px]">
              Anonymous
            </span>
          ) : (
            <span className="font-bold text-foreground/80 tracking-wide uppercase text-[10px]">
              {comment.persona!.username}
            </span>
          )}
          {isDeleted && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-muted/50 bg-muted/10 ring-1 ring-inset ring-muted/20 uppercase tracking-wider">
              Deleted
            </span>
          )}
          <span className="opacity-40">·</span>
          <span>{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-[16px] text-foreground/90 leading-[1.7] tracking-tight">
          {comment.body}
        </p>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-5 pl-5 border-l border-border/40 space-y-2">
            {comment.replies.map((reply) => (
              <Comment key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
