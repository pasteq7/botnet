"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Community>) => Promise<void>;
  initialData?: Community | null;
}

const defaultForm = (): Partial<Community> => ({
  name: "",
  slug: "",
  description: "",
  icon_emoji: "🏘️",
  topic_prompt: "",
  tone_guidelines: "",
  content_modes: ["news"],
  content_mode_weights: { news: 1, discussion: 0, tips: 0, historical: 0, showcase: 0, ask: 0, "web-search": 0 },
  language: "en",
  language_strict: false,
});

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

export default function CommunityModal({ isOpen, onClose, onSubmit, initialData }: CommunityModalProps) {
  const [formData, setFormData] = useState<Partial<Community>>(
    isOpen ? (initialData ? { ...initialData } : defaultForm()) : defaultForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"basics" | "content">("basics");

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setFormData((prev) => ({ ...prev, name, ...(initialData ? {} : { slug }) }));
  };

  const updateWeight = (mode: ContentMode, val: number) => {
    const weights = { ...((formData.content_mode_weights || {}) as Record<ContentMode, number>), [mode]: val };
    const modes = (Object.entries(weights) as [ContentMode, number][])
      .filter(([, w]) => w > 0)
      .map(([m]) => m);
    setFormData((prev) => ({ ...prev, content_mode_weights: weights, content_modes: modes }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const weights = (formData.content_mode_weights || {}) as Record<string, number>;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const basicsValid = formData.name && formData.slug && formData.topic_prompt && formData.tone_guidelines;

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
            className="relative w-full sm:max-w-xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/60 overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-medium text-foreground">
                    {initialData ? "Edit community" : "New community"}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {step === "basics" ? "Basic settings" : "Content strategy"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted/50 hover:text-foreground transition-colors p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex gap-1 mt-4 bg-background rounded-lg p-1">
                {(["basics", "content"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(s)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                      step === s ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {s === "basics" ? "Basics" : "Content"}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {step === "basics" && (
                  <>
                    <div className="flex gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted tracking-wide">Icon</label>
                        <input
                          value={formData.icon_emoji || ""}
                          onChange={(e) => setFormData((p) => ({ ...p, icon_emoji: e.target.value }))}
                          className="w-16 text-center bg-surface border border-border/60 rounded-lg px-2 py-2 text-xl focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-muted tracking-wide">Name *</label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className={inputCls}
                          placeholder="e.g. Science"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted tracking-wide">Slug *</label>
                      <div className="flex items-center bg-surface border border-border/60 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-accent/30 transition">
                        <span className="px-3 py-2 text-sm text-muted border-r border-border/60 bg-surface-hover shrink-0">c/</span>
                        <input
                          required
                          value={formData.slug}
                          onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                          className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
                          placeholder="science"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted tracking-wide">Description</label>
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className={inputCls + " resize-none"}
                        placeholder="What is this community about?"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted tracking-wide">Topic prompt *</label>
                      <p className="text-[11px] text-muted/60">What news or topics should AI hunt for?</p>
                      <textarea
                        required
                        value={formData.topic_prompt || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, topic_prompt: e.target.value }))}
                        rows={3}
                        className={inputCls + " resize-none"}
                        placeholder="Find breaking news and research about..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted tracking-wide">Tone guidelines *</label>
                      <p className="text-[11px] text-muted/60">Community personality and interaction style.</p>
                      <textarea
                        required
                        value={formData.tone_guidelines || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, tone_guidelines: e.target.value }))}
                        rows={3}
                        className={inputCls + " resize-none"}
                        placeholder="Curious and evidence-based. Avoid hype..."
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted tracking-wide">Language</label>
                        <div className="flex items-center gap-3">
                          <input
                            value={formData.language || "en"}
                            onChange={(e) => setFormData((p) => ({ ...p, language: e.target.value }))}
                            className="w-16 bg-surface border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
                            placeholder="en"
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.language_strict}
                              onChange={(e) => setFormData((p) => ({ ...p, language_strict: e.target.checked }))}
                              className="rounded text-accent focus:ring-accent/30"
                            />
                            <span className="text-xs text-muted">Strict</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {step === "content" && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-muted/70">
                      Set a weight for each content type. Higher weight = more frequent. Set to 0 to disable.
                    </p>
                    {ALL_MODES.map((mode) => {
                      const weight = weights[mode] || 0;
                      const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;

                      return (
                        <div key={mode} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-foreground/80 capitalize">{mode}</span>
                              <span className="text-xs text-muted/60 ml-2">{MODE_DESCRIPTIONS[mode]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted w-8 text-right">{pct}%</span>
                              <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={weight}
                                onChange={(e) => updateWeight(mode, parseFloat(e.target.value) || 0)}
                                className="w-16 bg-surface border border-border/60 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
                              />
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-border/60 overflow-hidden">
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

              <div className="px-6 py-4 border-t border-border/40 bg-surface flex items-center justify-between gap-3">
                <div />
                <div className="flex gap-2">
                  {step === "content" && (
                    <button
                      type="button"
                      onClick={() => setStep("basics")}
                      className="px-4 py-2 text-sm text-muted border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground transition-colors"
                    >
                      &larr; Back
                    </button>
                  )}
                  {step === "basics" ? (
                    <button
                      type="button"
                      disabled={!basicsValid}
                      onClick={() => setStep("content")}
                      className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next &rarr;
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? "Saving..." : initialData ? "Save changes" : "Create community"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
