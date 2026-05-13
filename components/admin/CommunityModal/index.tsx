"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPicker } from "@/components/ui/IconPicker";
import type { Community, ContentMode } from "@/types";
import type { SaveState, TriggerState, DeleteState, NavSection } from "./types";
import { defaultForm } from "./types";
import { ModalHeader } from "./ModalHeader";
import { SidebarNav } from "./SidebarNav";
import { SettingsPanel } from "./SettingsPanel";
import { ContentWeightsPanel } from "./ContentWeightsPanel";
import { DangerZonePanel } from "./DangerZonePanel";
import { ModalFooter } from "./ModalFooter";
import type { CommunityModalProps } from "./types";

export default function CommunityModal({
  isOpen, onClose, community, onSubmit, onSuccess, onDeleted,
}: CommunityModalProps) {
  const isCreating = !community;
  const [formData, setFormData] = useState<Partial<Community>>(
    isOpen ? (community ? { ...community } : defaultForm()) : defaultForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [triggerState, setTriggerState] = useState<TriggerState>("idle");
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [activeSection, setActiveSection] = useState<NavSection>("settings");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const updateWeight = (mode: ContentMode, val: number) => {
    setFormData((prev) => {
      const prevWeights = (prev.content_mode_weights || {}) as Record<ContentMode, number>;
      const weights = { ...prevWeights, [mode]: val };
      const modes = (Object.entries(weights) as [ContentMode, number][]).filter(([, w]) => w > 0).map(([m]) => m);
      return { ...prev, content_mode_weights: weights, content_modes: modes };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !community) return;
    setSaveState("saving");
    const res = await fetch("/api/admin/communities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: community.id,
        icon_name: formData.icon_name || null,
        topic_prompt: formData.topic_prompt,
        tone_guidelines: formData.tone_guidelines,
        is_active: formData.is_active,
        content_modes: formData.content_modes,
        content_mode_weights: formData.content_mode_weights,
        language: formData.language,
        language_strict: formData.language_strict,
        generation_interval_minutes: formData.generation_interval_minutes ?? null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSaveState("success");
      onSuccess?.(updated);
      setTimeout(() => setSaveState("idle"), 2500);
    } else {
      setSaveState("error");
    }
  };

  const handleTrigger = async () => {
    if (!community) return;
    setTriggerState("triggering");
    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: community.id }),
    });
    setTriggerState(res.ok ? "success" : "error");
    setTimeout(() => setTriggerState("idle"), 3000);
  };

  const handleDelete = async () => {
    if (!community) return;
    setDeleteState("deleting");
    const res = await fetch(`/api/admin/communities?id=${community.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted?.(community.id);
      onClose();
    } else {
      setDeleteState("error");
    }
  };

  const weights = (formData.content_mode_weights || {}) as Record<string, number>;
  const basicsValid = !!(formData.name && formData.slug && formData.topic_prompt && formData.tone_guidelines);

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full sm:max-w-6xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col"
            style={{ maxHeight: "min(88vh, 700px)" }}
          >
            <ModalHeader
              isCreating={isCreating}
              formData={formData}
              community={community}
              triggerState={triggerState}
              onTrigger={handleTrigger}
              onClose={onClose}
            />

            <form onSubmit={isCreating ? handleCreate : handleSave} className="flex flex-1 min-h-0">
              <SidebarNav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                showDanger={!isCreating}
              />

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {error && (
                    <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {error}
                    </div>
                  )}

                  {activeSection === "settings" && (
                    <SettingsPanel
                      formData={formData}
                      isCreating={isCreating}
                      onChange={setFormData}
                      onOpenIconPicker={() => setShowIconPicker(true)}
                    />
                  )}

                  {activeSection === "content" && (
                    <ContentWeightsPanel
                      weights={weights}
                      onChange={updateWeight}
                    />
                  )}

                  {!isCreating && activeSection === "danger" && (
                    <DangerZonePanel
                      deleteState={deleteState}
                      onDelete={handleDelete}
                      onInitiateDelete={() => setDeleteState("confirm")}
                      onCancelDelete={() => setDeleteState("idle")}
                    />
                  )}
                </div>
              </div>
            </form>

            <ModalFooter
              isCreating={isCreating}
              saveState={saveState}
              isSubmitting={isSubmitting}
              basicsValid={basicsValid}
              activeSection={activeSection}
              onClose={onClose}
              onSave={() => isCreating ? handleCreate({ preventDefault: () => {} } as never) : handleSave({ preventDefault: () => {} } as never)}
            />
          </motion.div>
        </div>
      )}

      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(name) => setFormData((p) => ({ ...p, icon_name: name }))}
        current={formData.icon_name}
      />
    </AnimatePresence>
  );
}
