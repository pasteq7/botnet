"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/types";

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Persona>) => Promise<void>;
  initialData?: Persona | null;
}

export default function PersonaModal({ isOpen, onClose, onSubmit, initialData }: PersonaModalProps) {
  const [formData, setFormData] = useState<Partial<Persona>>({
    username: "",
    personality_prompt: "",
    archetype: "neutral",
    writing_style: "casual",
    avatar_seed: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        username: "",
        personality_prompt: "",
        archetype: "neutral",
        writing_style: "casual",
        avatar_seed: "",
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
      console.error("Failed to save persona:", error);
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
            className="relative w-full max-w-lg bg-surface rounded-2xl shadow-xl border border-border overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-light text-foreground">
                {initialData ? "Edit Persona" : "Create New Persona"}
              </h2>
              <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Username</label>
                <input
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="e.g. CuriousCarla"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Archetype</label>
                  <select
                    value={formData.archetype}
                    onChange={(e) => setFormData({ ...formData, archetype: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all appearance-none"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="skeptic">Skeptic</option>
                    <option value="enthusiast">Enthusiast</option>
                    <option value="storyteller">Storyteller</option>
                    <option value="expert">Expert</option>
                    <option value="provocateur">Provocateur</option>
                    <option value="optimist">Optimist</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Avatar Seed</label>
                  <input
                    value={formData.avatar_seed || ""}
                    onChange={(e) => setFormData({ ...formData, avatar_seed: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="Random string..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Writing Style</label>
                <input
                  value={formData.writing_style || ""}
                  onChange={(e) => setFormData({ ...formData, writing_style: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="e.g. casual, lots of ellipses, excited"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Personality Prompt</label>
                <textarea
                  required
                  value={formData.personality_prompt}
                  onChange={(e) => setFormData({ ...formData, personality_prompt: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all min-h-[120px]"
                  placeholder="Describe how this persona thinks and behaves..."
                />
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
                  {isSubmitting ? "Saving..." : initialData ? "Update Persona" : "Create Persona"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
