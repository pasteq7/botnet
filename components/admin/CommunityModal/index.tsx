"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader, Sparkles } from "lucide-react";
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

  // AI autofill
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

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
        min_comments_per_thread: formData.min_comments_per_thread ?? null,
        max_comments_per_thread: formData.max_comments_per_thread ?? null,
        search_scope: formData.search_scope || null,
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

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/ai-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "community", prompt: aiPrompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "AI generation failed");
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        slug: data.slug || prev.slug,
        description: data.description || prev.description,
        topic_prompt: data.topic_prompt || prev.topic_prompt,
        tone_guidelines: data.tone_guidelines || prev.tone_guidelines,
        icon_name: data.icon_name || prev.icon_name,
        language: data.language || prev.language,
        language_strict: data.language_strict ?? prev.language_strict,
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
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
            style={{ height: "min(88vh, 700px)" }}
          >
            <ModalHeader
              isCreating={isCreating}
              formData={formData}
              community={community}
              triggerState={triggerState}
              onTrigger={handleTrigger}
              onActiveChange={(isActive) => setFormData((prev) => ({ ...prev, is_active: isActive }))}
              onClose={onClose}
            />

            <form onSubmit={isCreating ? handleCreate : handleSave} className="flex flex-1 min-h-0">
              <SidebarNav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                showDanger={!isCreating}
              />

              <div className="flex-1 overflow-y-auto relative">
                {/* ── AI Generating Overlay ── */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center"
                    >
                      <Loader className="size-6 animate-spin text-accent mb-3" />
                      <p className="text-sm font-medium text-foreground/80">Generating community from AI...</p>
                      <p className="text-xs text-muted/60 mt-1">Using AI model configured in settings</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="p-6 space-y-6">
                  {error && (
                    <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {error}
                    </div>
                  )}

                  {/* ── AI Autofill ── */}
                  {isCreating && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <Sparkles className="size-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Auto-generate</p>
                            <p className="text-xs text-muted/70">Describe a community.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/60 px-3 py-2 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20">
                          <input
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g. a community for indie AI builders"
                            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/40 focus:outline-none"
                            onKeyDown={(e) => { if (e.key === "Enter" && !isGenerating) { e.preventDefault(); handleAiGenerate(); } }}
                          />
                          <button
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <Loader className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            {isGenerating ? "Generating..." : "Generate"}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/30" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted/60">or fill manually</span>
                        <div className="h-px flex-1 bg-border/30" />
                      </div>
                    </div>
                  )}
                  {aiError && (
                    <p className="text-xs text-rose-400 mt-1.5 ml-1">{aiError}</p>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
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
                    </motion.div>
                  </AnimatePresence>
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
