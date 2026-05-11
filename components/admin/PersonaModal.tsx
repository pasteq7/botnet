"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Persona, Community } from "@/types";

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Persona>) => Promise<void>;
  initialData?: Persona | null;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";
const selectCls = inputCls;

export default function PersonaModal({ isOpen, onClose, onSubmit, initialData }: PersonaModalProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");

  const initialCommunityIds = initialData?.persona_communities?.map(pc => pc.community_id) || [];

  const [formData, setFormData] = useState<Partial<Persona> & { community_ids: string[] }>(
    initialData
      ? { ...initialData, community_ids: initialCommunityIds }
      : {
          username: "",
          personality_prompt: "",
          archetype: "neutral",
          writing_style: "casual",
          avatar_seed: "",
          scope: "global" as const,
          community_ids: [],
        }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        const res = await fetch("/api/admin/communities");
        if (res.ok) {
          setCommunities(await res.json());
        }
      };
      load();
    }
  }, [isOpen]);

  const scope = formData.scope || "global";

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(communitySearch.toLowerCase())
  );

  const toggleCommunity = (communityId: string) => {
    const ids = formData.community_ids || [];
    if (ids.includes(communityId)) {
      setFormData({ ...formData, community_ids: ids.filter(id => id !== communityId) });
    } else {
      setFormData({ ...formData, community_ids: [...ids, communityId] });
    }
  };

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
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface rounded-2xl border border-border/60 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div>
                <h2 className="text-base font-medium text-foreground">
                  {initialData ? "Edit persona" : "New persona"}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {initialData ? "Update persona settings" : "Create a new AI persona"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted/50 hover:text-foreground transition-colors p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted tracking-wide">Username</label>
                <input
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. CuriousMarie"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted tracking-wide">Archetype</label>
                  <select
                    value={formData.archetype}
                    onChange={(e) => setFormData({ ...formData, archetype: e.target.value })}
                    className={selectCls}
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted tracking-wide">Avatar seed</label>
                  <input
                    value={formData.avatar_seed || ""}
                    onChange={(e) => setFormData({ ...formData, avatar_seed: e.target.value })}
                    className={inputCls}
                    placeholder="Random string..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted tracking-wide">Writing style</label>
                <input
                  value={formData.writing_style || ""}
                  onChange={(e) => setFormData({ ...formData, writing_style: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. casual, lots of ellipses, excited"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted tracking-wide">Personality prompt</label>
                <textarea
                  required
                  value={formData.personality_prompt}
                  onChange={(e) => setFormData({ ...formData, personality_prompt: e.target.value })}
                  className={inputCls + " min-h-[100px] resize-none"}
                  placeholder="Describe how this persona thinks and behaves..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted tracking-wide">Scope</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === "global"}
                      onChange={() => setFormData({ ...formData, scope: "global" })}
                      className="text-accent focus:ring-accent/30"
                    />
                    <span className="text-sm text-foreground">Global</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === "scoped"}
                      onChange={() => setFormData({ ...formData, scope: "scoped" })}
                      className="text-accent focus:ring-accent/30"
                    />
                    <span className="text-sm text-foreground">Scoped</span>
                  </label>
                </div>

                {scope === "scoped" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      placeholder="Search communities..."
                      className={inputCls}
                    />
                    <div className="max-h-40 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40">
                      {filteredCommunities.length === 0 ? (
                        <p className="text-xs text-muted/60 px-3 py-2">No communities found</p>
                      ) : (
                        filteredCommunities.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={(formData.community_ids || []).includes(c.id)}
                              onChange={() => toggleCommunity(c.id)}
                              className="rounded text-accent focus:ring-accent/30"
                            />
                            <span className="text-sm text-foreground">{c.icon_emoji} {c.name}</span>
                            <span className="text-xs text-muted ml-auto">c/{c.slug}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted border border-border/60 rounded-lg hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : initialData ? "Save changes" : "Create persona"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
