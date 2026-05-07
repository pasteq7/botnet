"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Community, ContentMode } from "@/types";

const ALL_MODES: ContentMode[] = ["news", "discussion", "tips", "historical", "showcase", "ask"];

interface CommunityManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community | null;
  onCommunityUpdated?: (community: Community) => void;
}

export default function CommunityManageModal({ isOpen, onClose, community, onCommunityUpdated }: CommunityManageModalProps) {
  const [formData, setFormData] = useState<Partial<Community> | null>(null);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (community && isOpen) {
      setFormData({ ...community });
      setMessage(null);
    }
  }, [community, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !community) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/communities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: community.id,
        topic_prompt: formData.topic_prompt,
        tone_guidelines: formData.tone_guidelines,
        is_active: formData.is_active,
        refresh_interval_hours: formData.refresh_interval_hours,
        content_modes: formData.content_modes,
        content_mode_weights: formData.content_mode_weights,
        language: formData.language,
        language_strict: formData.language_strict,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setMessage({ type: "success", text: "Settings saved successfully" });
      onCommunityUpdated?.(updated);
    } else {
      setMessage({ type: "error", text: "Failed to save settings" });
    }
    setSaving(false);
  };

  const handleTrigger = async () => {
    if (!community) return;
    setTriggering(true);
    setMessage({ type: "info", text: "Queuing generation job..." });

    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: community.id }),
    });

    const result = await res.json();

    if (res.ok) {
      setMessage({ type: "success", text: "Generation job queued successfully! Check the logs for results." });
    } else {
      setMessage({ type: "error", text: `Failed to queue: ${result.error || "Unknown error"}` });
    }
    setTriggering(false);
  };

  if (!formData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-8 py-6 border-b border-border bg-surface flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{community?.icon_emoji}</span>
                <h2 className="text-xl font-light text-foreground">{community?.name}</h2>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleTrigger}
                  disabled={triggering || !community?.is_active}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${triggering
                    ? "bg-border text-muted cursor-not-allowed"
                    : "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md"
                  }`}
                >
                  {triggering ? "⏳ Queuing..." : "⚡ Trigger Generation"}
                </button>
                <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              {message && (
                <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" :
                  message.type === "error" ? "bg-red-50 text-red-700 border border-red-100" :
                    "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  <div className="flex items-center gap-2">
                    {message.type === "success" && <span>✓</span>}
                    {message.text}
                  </div>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Topic Prompt</label>
                  <p className="text-xs text-muted mb-3">Instructions for the AI on what news stories to hunt for.</p>
                  <textarea
                    value={formData.topic_prompt}
                    onChange={(e) => setFormData({ ...formData, topic_prompt: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border-border text-sm text-foreground focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tone Guidelines</label>
                  <p className="text-xs text-muted mb-3">Defines the community personality and interaction style.</p>
                  <textarea
                    value={formData.tone_guidelines}
                    onChange={(e) => setFormData({ ...formData, tone_guidelines: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border-border text-sm text-foreground focus:ring-accent focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        placeholder="en, fr, de..."
                        className="w-24 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.language_strict}
                          onChange={(e) => setFormData({ ...formData, language_strict: e.target.checked })}
                          className="rounded text-accent focus:ring-accent"
                        />
                        <span className="text-xs text-muted">Strict Enforcement</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Content Strategy & Weights</label>
                    <p className="text-xs text-muted mb-4">Set the relative frequency for each content type. Setting a weight to 0 disables that mode.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ALL_MODES.map((mode) => {
                        const weights = (formData.content_mode_weights || {}) as Record<string, number>;
                        const weight = weights[mode] || 0;
                        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
                        const percentage = Math.round((weight / totalWeight) * 100);

                        return (
                          <div key={mode} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                            <div>
                              <p className="text-sm font-medium text-foreground capitalize">{mode}</p>
                              <p className="text-[10px] text-muted">{percentage}% share</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={weight}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const newWeights = { ...weights, [mode]: val } as Record<ContentMode, number>;
                                  const newModes = Object.entries(newWeights)
                                    .filter(([, w]) => w > 0)
                                    .map(([m]) => m as ContentMode);

                                  setFormData({
                                    ...formData,
                                    content_mode_weights: newWeights,
                                    content_modes: newModes,
                                  });
                                }}
                                className="w-20 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-foreground">{formData.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Refresh (Hours)</label>
                    <input
                      type="number"
                      value={formData.refresh_interval_hours}
                      onChange={(e) => setFormData({ ...formData, refresh_interval_hours: parseInt(e.target.value) || 0 })}
                      className="w-20 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-between items-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-foreground text-background px-6 py-2 rounded-lg text-sm font-medium hover:brightness-125 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
