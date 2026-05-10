// components/admin/CommunityManageModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Community, ContentMode } from "@/types";

const ALL_MODES: ContentMode[] = ["news", "discussion", "tips", "historical", "showcase", "ask", "web-search"];

const MODE_DESCRIPTIONS: Record<ContentMode, string> = {
  news: "Curated news stories",
  discussion: "Open-ended discussions",
  tips: "Practical tips & how-tos",
  historical: "Historical context",
  showcase: "Member showcases",
  ask: "Q&A threads",
  "web-search": "Web search — any relevant page",
};

interface CommunityManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community | null;
  onCommunityUpdated?: (community: Community) => void;
}

type SaveState = "idle" | "saving" | "success" | "error";
type TriggerState = "idle" | "triggering" | "success" | "error";

export default function CommunityManageModal({
  isOpen,
  onClose,
  community,
  onCommunityUpdated,
}: CommunityManageModalProps) {
  const [formData, setFormData] = useState<Partial<Community> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [triggerState, setTriggerState] = useState<TriggerState>("idle");
  const [activeTab, setActiveTab] = useState<"settings" | "content">("settings");

  useEffect(() => {
    if (community && isOpen) {
      setFormData({ ...community });
      setSaveState("idle");
      setTriggerState("idle");
      setActiveTab("settings");
    }
  }, [community, isOpen]);

  const updateWeight = (mode: ContentMode, val: number) => {
    if (!formData) return;
    const weights = { ...((formData.content_mode_weights || {}) as Record<ContentMode, number>), [mode]: val };
    const modes = (Object.entries(weights) as [ContentMode, number][])
      .filter(([, w]) => w > 0)
      .map(([m]) => m);
    setFormData((prev) => ({ ...prev, content_mode_weights: weights, content_modes: modes }));
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
        topic_prompt: formData.topic_prompt,
        tone_guidelines: formData.tone_guidelines,
        is_active: formData.is_active,
        content_modes: formData.content_modes,
        content_mode_weights: formData.content_mode_weights,
        language: formData.language,
        language_strict: formData.language_strict,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setSaveState("success");
      onCommunityUpdated?.(updated);
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

  if (!formData || !community) return null;

  const weights = (formData.content_mode_weights || {}) as Record<string, number>;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full sm:max-w-2xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-0 shrink-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-xl">
                    {community.icon_emoji || "🏘️"}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{community.name}</h2>
                    <p className="text-xs text-muted font-mono">c/{community.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Trigger button */}
                  <button
                    onClick={handleTrigger}
                    disabled={triggerState === "triggering" || !community.is_active}
                    title={!community.is_active ? "Activate this community first" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${triggerState === "success"
                      ? "bg-green-100 text-green-700"
                      : triggerState === "error"
                        ? "bg-red-100 text-red-700"
                        : triggerState === "triggering"
                          ? "bg-border text-muted cursor-not-allowed"
                          : community.is_active
                            ? "bg-accent/10 text-accent hover:bg-accent hover:text-white"
                            : "bg-border/50 text-muted cursor-not-allowed"
                      }`}
                  >
                    <span>
                      {triggerState === "triggering"
                        ? "⏳"
                        : triggerState === "success"
                          ? "✓"
                          : triggerState === "error"
                            ? "✗"
                            : "⚡"}
                    </span>
                    {triggerState === "triggering"
                      ? "Queuing…"
                      : triggerState === "success"
                        ? "Queued!"
                        : triggerState === "error"
                          ? "Failed"
                          : "Generate"}
                  </button>
                  <button
                    onClick={onClose}
                    className="text-muted hover:text-foreground text-xl leading-none p-1 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {(["settings", "content"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {activeTab === "settings" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted uppercase tracking-wide">Topic prompt</label>
                      <p className="text-xs text-muted">What stories should the AI hunt for?</p>
                      <textarea
                        value={formData.topic_prompt || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, topic_prompt: e.target.value }))}
                        rows={4}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted uppercase tracking-wide">Tone guidelines</label>
                      <p className="text-xs text-muted">Community personality and interaction style.</p>
                      <textarea
                        value={formData.tone_guidelines || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, tone_guidelines: e.target.value }))}
                        rows={4}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                      />
                    </div>

                    {/* Status + refresh + language row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted uppercase tracking-wide">Status</label>
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, is_active: !p?.is_active }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all w-full ${formData.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-surface text-muted border-border"
                            }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${formData.is_active ? "bg-green-500" : "bg-muted"}`}
                          />
                          {formData.is_active ? "Active" : "Inactive"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted uppercase tracking-wide">Language</label>
                        <div className="flex items-center gap-2">
                          <input
                            value={formData.language || "en"}
                            onChange={(e) => setFormData((p) => ({ ...p, language: e.target.value }))}
                            className="w-14 bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                          />
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.language_strict}
                              onChange={(e) => setFormData((p) => ({ ...p, language_strict: e.target.checked }))}
                              className="rounded text-accent focus:ring-accent"
                            />
                            <span className="text-xs text-muted">Strict</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "content" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted">
                      Adjust how often each type of content is generated. Set to 0 to disable a type.
                    </p>
                    {ALL_MODES.map((mode) => {
                      const weight = weights[mode] || 0;
                      const pct = Math.round((weight / totalWeight) * 100);

                      return (
                        <div key={mode} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-foreground capitalize">{mode}</span>
                              <span className="text-xs text-muted ml-2">{MODE_DESCRIPTIONS[mode]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted w-8 text-right">{pct}%</span>
                              <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={weight}
                                onChange={(e) => updateWeight(mode, parseFloat(e.target.value) || 0)}
                                className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                              />
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-surface shrink-0 flex items-center justify-between gap-3">
                <div className="text-sm">
                  {saveState === "success" && (
                    <span className="text-green-600 flex items-center gap-1.5">
                      <span>✓</span> Saved
                    </span>
                  )}
                  {saveState === "error" && <span className="text-red-600">Failed to save — try again</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-hover transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saveState === "saving"}
                    className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:brightness-125 disabled:opacity-50 transition-all"
                  >
                    {saveState === "saving" ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}