import { motion } from "framer-motion";
import { Check, Loader, Save } from "lucide-react";
import type { SaveState, NavSection } from "./types";

export function ModalFooter({
  isCreating, saveState, isSubmitting, basicsValid, activeSection,
  onClose, onSave,
}: {
  isCreating: boolean;
  saveState: SaveState;
  isSubmitting: boolean;
  basicsValid: boolean;
  activeSection: NavSection;
  onClose: () => void;
  onSave?: () => void;
}) {
  return (
    <div className="px-6 py-3.5 border-t border-border/10 bg-surface/40 shrink-0 flex items-center justify-between gap-4">
      <div className="text-sm min-w-0">
        {!isCreating && saveState === "success" && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs"
          >
            <Check className="size-3.5" /> Changes saved
          </motion.span>
        )}
        {!isCreating && saveState === "error" && (
          <span className="text-red-400 font-semibold text-xs">Error saving changes</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground border border-border/20 rounded-lg hover:bg-surface/50 transition-all"
        >
          {isCreating ? "Cancel" : "Close"}
        </button>
        {activeSection !== "danger" && (
          <button
            type="submit"
            form="community-form"
            disabled={isCreating ? (isSubmitting || !basicsValid) : saveState === "saving"}
            onClick={onSave}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-accent rounded-lg shadow-md hover:shadow-accent/30 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-40 disabled:translate-y-0"
          >
            {isSubmitting || saveState === "saving" ? (
              <><Loader className="size-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="size-3.5" /> {isCreating ? "Create community" : "Save changes"}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
