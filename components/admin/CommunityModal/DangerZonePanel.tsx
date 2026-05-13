import { Trash2 } from "lucide-react";
import type { DeleteState } from "./types";

export function DangerZonePanel({
  deleteState,
  onDelete,
  onInitiateDelete,
  onCancelDelete,
}: {
  deleteState: DeleteState;
  onDelete: () => void;
  onInitiateDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h3 className="text-sm font-bold text-red-400 mb-1">Delete community</h3>
        <p className="text-sm text-muted/80 mb-4 leading-relaxed">
          Permanently deletes this community along with all its threads, comments, and logs.
          This cannot be undone.
        </p>
        {deleteState === "confirm" || deleteState === "deleting" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteState === "deleting"}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-all"
            >
              {deleteState === "deleting" ? "Deleting…" : "Yes, delete it"}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="px-4 py-2 text-sm text-muted border border-border/40 rounded-lg hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onInitiateDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="size-4" />
            {deleteState === "error" ? "Error — try again" : "Delete community"}
          </button>
        )}
      </div>
    </div>
  );
}
