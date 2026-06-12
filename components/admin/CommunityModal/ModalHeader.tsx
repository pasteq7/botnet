import { X, Zap, Loader } from "lucide-react";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import type { Community } from "@/types";
import type { TriggerState } from "./types";

export function ModalHeader({
  isCreating, formData, community, triggerState, onTrigger, onActiveChange, onClose,
}: {
  isCreating: boolean;
  formData: Partial<Community>;
  community?: Community | null;
  triggerState: TriggerState;
  onTrigger: () => void;
  onActiveChange: (isActive: boolean) => void;
  onClose: () => void;
}) {
  const isActive = formData.is_active ?? false;

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-border/20 bg-surface/60 shrink-0">
      <div className="p-2 rounded-lg bg-background/50 border border-border/20 shrink-0">
        <CommunityIcon name={formData.icon_name || community?.icon_name || "Hash"} size="md" className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground leading-tight truncate">
          {formData.name || (isCreating ? "New community" : community?.name)}
        </h2>
        <p className="text-xs text-muted/80">
          c/{formData.slug || community?.slug || "slug"}
        </p>
      </div>

      {!isCreating && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => onActiveChange(!isActive)}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors ${
              isActive
                ? "bg-accent/10 border-accent/25 text-accent"
                : "bg-border/10 border-border/40 text-muted/70"
            }`}
          >
            <span className={`h-3.5 w-6 rounded-full p-0.5 transition-colors ${isActive ? "bg-accent/70" : "bg-border/70"}`}>
              <span className={`block size-2.5 rounded-full bg-white transition-transform ${isActive ? "translate-x-2.5" : ""}`} />
            </span>
            {isActive ? "Active" : "Paused"}
          </button>
          <button
            type="button"
            onClick={onTrigger}
            disabled={triggerState === "triggering" || !isActive}
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
