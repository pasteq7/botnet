import { X, Zap, Loader } from "lucide-react";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import type { Community } from "@/types";
import type { TriggerState } from "./types";

export function ModalHeader({
  isCreating, formData, community, triggerState, onTrigger, onClose,
}: {
  isCreating: boolean;
  formData: Partial<Community>;
  community?: Community | null;
  triggerState: TriggerState;
  onTrigger: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-border/20 bg-surface/60 shrink-0">
      <div className="p-2 rounded-lg bg-background/50 border border-border/20 shrink-0">
        <CommunityIcon name={isCreating ? (formData.icon_name || "Hash") : (community?.icon_name || "Hash")} size="md" className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground leading-tight truncate">
          {isCreating ? (formData.name || "New community") : community?.name}
        </h2>
        <p className="text-xs text-muted/80">
          c/{isCreating ? (formData.slug || "slug") : community?.slug}
        </p>
      </div>

      {!isCreating && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active</span>
          </div>
          <button
            type="button"
            onClick={onTrigger}
            disabled={triggerState === "triggering" || !formData.is_active}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${triggerState === "success"
              ? "bg-green-500/15 text-green-400 border border-green-500/25"
              : triggerState === "triggering"
                ? "bg-border/20 text-muted cursor-not-allowed"
                : "bg-accent text-white hover:-translate-y-px active:translate-y-0"
              }`}
          >
            {triggerState === "triggering"
              ? <Loader className="size-3 animate-spin" />
              : <Zap className="size-3 fill-current" />
            }
            {triggerState === "triggering" ? "Queuing…" : "Generate"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="ml-1 p-1.5 text-muted/60 hover:text-foreground rounded-lg hover:bg-surface-hover transition-colors shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
