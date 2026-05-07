"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Subreddit } from "@/types";

interface SubredditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Subreddit>) => Promise<void>;
  initialData?: Subreddit | null;
}

export default function SubredditModal({ isOpen, onClose, onSubmit, initialData }: SubredditModalProps) {
  const [formData, setFormData] = useState<Partial<Subreddit>>({
    name: "",
    slug: "",
    description: "",
    icon_emoji: "🏘️",
    topic_prompt: "",
    tone_guidelines: "",
    refresh_interval_hours: 4,
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
      console.error("Failed to save subreddit:", error);
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
            className="absolute inset-0 bg-[#4A443F]/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#F9F8F6] rounded-2xl shadow-xl border border-[#E5E1DA] overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-[#E5E1DA] bg-white flex justify-between items-center">
              <h2 className="text-xl font-light text-[#4A443F]">
                {initialData ? "Edit Subreddit" : "Add New Subreddit"}
              </h2>
              <button onClick={onClose} className="text-[#B5B0A7] hover:text-[#4A443F] transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all"
                    placeholder="e.g. Science"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Slug</label>
                  <input
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all"
                    placeholder="e.g. science"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all min-h-[80px]"
                  placeholder="What is this community about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Icon Emoji</label>
                  <input
                    value={formData.icon_emoji || ""}
                    onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
                    className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all"
                    placeholder="e.g. 🔬"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Refresh Interval (Hours)</label>
                  <input
                    type="number"
                    value={formData.refresh_interval_hours}
                    onChange={(e) => setFormData({ ...formData, refresh_interval_hours: parseInt(e.target.value) })}
                    className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Topic Prompt</label>
                <textarea
                  required
                  value={formData.topic_prompt}
                  onChange={(e) => setFormData({ ...formData, topic_prompt: e.target.value })}
                  className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all min-h-[100px]"
                  placeholder="System instructions for finding relevant news..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#828A7A]">Tone Guidelines</label>
                <textarea
                  required
                  value={formData.tone_guidelines}
                  onChange={(e) => setFormData({ ...formData, tone_guidelines: e.target.value })}
                  className="w-full bg-white border border-[#E5E1DA] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#828A7A]/20 transition-all min-h-[100px]"
                  placeholder="How should the personas interact in this sub?"
                />
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-[#828A7A] hover:bg-[#F5F2ED] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#828A7A] text-white rounded-lg text-sm font-medium hover:bg-[#6D7566] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : initialData ? "Update Subreddit" : "Create Subreddit"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
