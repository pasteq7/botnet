"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Community, ContentMode } from "@/types";

const ALL_MODES: ContentMode[] = ["news", "discussion", "tips", "historical", "showcase", "ask"];

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Community>) => Promise<void>;
  initialData?: Community | null;
}

export default function CommunityModal({ isOpen, onClose, onSubmit, initialData }: CommunityModalProps) {
  const [formData, setFormData] = useState<Partial<Community>>({
    name: "",
    slug: "",
    description: "",
    icon_emoji: "🏘️",
    topic_prompt: "",
    tone_guidelines: "",
    refresh_interval_hours: 4,
    content_modes: ["news"],
    content_mode_weights: { news: 1.0, discussion: 0, tips: 0, historical: 0, showcase: 0, ask: 0 },
    language: "en",
    language_strict: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        icon_emoji: "🏘️",
        topic_prompt: "",
        tone_guidelines: "",
        refresh_interval_hours: 4,
        content_modes: ["news"],
        content_mode_weights: { news: 1.0, discussion: 0, tips: 0, historical: 0, showcase: 0, ask: 0 },
        language: "en",
        language_strict: false,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save community:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-xl border border-border overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-light text-foreground">
                {initialData ? "Edit Community" : "Add New Community"}
              </h2>
              <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="e.g. Science"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Slug</label>
                  <input
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="e.g. science"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all min-h-[80px]"
                  placeholder="What is this community about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Icon Emoji</label>
                  <input
                    value={formData.icon_emoji || ""}
                    onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="e.g. 🔬"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Refresh Interval (Hours)</label>
                  <input
                    type="number"
                    value={formData.refresh_interval_hours}
                    onChange={(e) => setFormData({ ...formData, refresh_interval_hours: parseInt(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Topic Prompt</label>
                <textarea
                  required
                  value={formData.topic_prompt}
                  onChange={(e) => setFormData({ ...formData, topic_prompt: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px]"
                  placeholder="System instructions for finding relevant news..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Tone Guidelines</label>
                <textarea
                  required
                  value={formData.tone_guidelines}
                  onChange={(e) => setFormData({ ...formData, tone_guidelines: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px]"
                    placeholder="How should the personas interact in this community?"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Language</label>
                  <div className="flex items-center gap-4">
                    <input
                      value={formData.language || "en"}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-20 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      placeholder="en"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.language_strict}
                        onChange={(e) => setFormData({ ...formData, language_strict: e.target.checked })}
                        className="rounded text-accent focus:ring-accent"
                      />
                      <span className="text-xs text-muted">Strict</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Content Strategy & Weights</label>
                  <p className="text-xs text-muted">Set the relative frequency for each content type. Setting a weight to 0 disables that mode.</p>

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
                              className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : initialData ? "Update Community" : "Create Community"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
