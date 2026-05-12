"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Lock } from "lucide-react";
import Image from "next/image";
import type { Persona, Community, PersonaScope } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Persona>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Persona | null;
}

const input =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

const ARCHETYPES = [
  { value: "neutral", label: "Neutral", desc: "Balanced, measured" },
  { value: "skeptic", label: "Skeptic", desc: "Questions everything" },
  { value: "enthusiast", label: "Enthusiast", desc: "Passionate, energetic" },
  { value: "storyteller", label: "Storyteller", desc: "Narrative-driven" },
  { value: "expert", label: "Expert", desc: "Technical, precise" },
  { value: "provocateur", label: "Provocateur", desc: "Challenges norms" },
  { value: "optimist", label: "Optimist", desc: "Positive framing" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-semibold text-muted/50 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

export default function PersonaModal({ isOpen, onClose, onSubmit, onDelete, initialData }: Props) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const blank: {
    username: string;
    personality_prompt: string;
    archetype: string;
    writing_style: string;
    avatar_seed: string;
    scope: PersonaScope;
    community_ids: string[];
  } = {
    username: "",
    personality_prompt: "",
    archetype: "neutral",
    writing_style: "",
    avatar_seed: "",
    scope: "global",
    community_ids: [],
  };

  const [form, setForm] = useState<typeof blank>(
    initialData
      ? {
        ...blank,
        ...initialData,
        community_ids: initialData.persona_communities?.map((pc) => pc.community_id) ?? [],
      }
      : blank
  );

  // Avatar seed defaults to username if blank
  const avatarSeed = form.avatar_seed || form.username || "default";

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/admin/communities")
      .then((r) => r.json())
      .then(setCommunities)
      .catch(() => { });
  }, [isOpen]);

  const toggleCommunity = (id: string) => {
    setForm((f) => ({
      ...f,
      community_ids: f.community_ids.includes(id)
        ? f.community_ids.filter((c) => c !== id)
        : [...f.community_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(communitySearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <h2 className="text-sm font-medium text-foreground">
                {initialData ? "Edit persona" : "New persona"}
              </h2>
              <button onClick={onClose} className="text-muted/40 hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[78vh] scrollbar-thin">
              <div className="p-6 space-y-8">

                {/* ── Section 1: Identity ── */}
                <div>
                  <SectionLabel>Identity</SectionLabel>
                  <div className="flex items-center gap-4 mb-5">
                    {/* Live avatar preview */}
                    <div className="shrink-0 size-14 rounded-xl bg-background border border-border/60 flex items-center justify-center overflow-hidden">
                      <Image
                        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}`}
                        alt="Avatar preview"
                        width={56}
                        height={56}
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        required
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className={input}
                        placeholder="Username  e.g. CuriousMarie"
                      />
                      <input
                        value={form.avatar_seed}
                        onChange={(e) => setForm({ ...form, avatar_seed: e.target.value })}
                        className={input}
                        placeholder="Avatar seed  (leave blank to use username)"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Voice & Style ── */}
                <div>
                  <SectionLabel>Voice &amp; Style</SectionLabel>
                  <div className="space-y-4">
                    {/* Archetype — visual pill picker */}
                    <div>
                      <label className="text-xs text-muted/60 mb-2 block">Archetype</label>
                      <div className="flex flex-wrap gap-1.5">
                        {ARCHETYPES.map((a) => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => setForm({ ...form, archetype: a.value })}
                            title={a.desc}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${form.archetype === a.value
                              ? "bg-accent/20 border-accent text-accent"
                              : "border-border/60 text-muted/60 hover:text-foreground hover:border-muted/40"
                              }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                      {/* Show description of selected */}
                      <p className="text-[11px] text-muted/40 mt-1.5 h-4">
                        {ARCHETYPES.find((a) => a.value === form.archetype)?.desc}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-muted/60 mb-1.5 block">Writing style</label>
                      <input
                        value={form.writing_style}
                        onChange={(e) => setForm({ ...form, writing_style: e.target.value })}
                        className={input}
                        placeholder="e.g. terse and dry, lots of em-dashes, dry wit"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted/60 mb-1.5 block">Personality</label>
                      <textarea
                        required
                        value={form.personality_prompt}
                        onChange={(e) => setForm({ ...form, personality_prompt: e.target.value })}
                        className={input + " min-h-[90px] resize-none leading-relaxed"}
                        placeholder="How does this persona think, what do they care about, what are their blind spots…"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Reach ── */}
                <div>
                  <SectionLabel>Reach</SectionLabel>
                  <p className="text-xs text-muted/50 mb-3 -mt-2">
                    Where can this persona post?
                  </p>

                  {/* Scope — two large toggle cards */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(["global", "scoped"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, scope: s })}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${form.scope === s
                          ? "border-accent bg-accent/10"
                          : "border-border/60 hover:border-muted/40"
                          }`}
                      >
                        {s === "global"
                          ? <Globe className={`size-4 mt-0.5 shrink-0 ${form.scope === s ? "text-accent" : "text-muted/40"}`} />
                          : <Lock className={`size-4 mt-0.5 shrink-0 ${form.scope === s ? "text-accent" : "text-muted/40"}`} />
                        }
                        <div>
                          <p className={`text-xs font-medium ${form.scope === s ? "text-accent" : "text-foreground/70"}`}>
                            {s === "global" ? "All communities" : "Specific communities"}
                          </p>
                          <p className="text-[11px] text-muted/40 mt-0.5">
                            {s === "global" ? "Posts anywhere" : "Restricted to chosen"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Community picker — only shown when scoped */}
                  <AnimatePresence>
                    {form.scope === "scoped" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          value={communitySearch}
                          onChange={(e) => setCommunitySearch(e.target.value)}
                          placeholder="Filter communities…"
                          className={input + " mb-2"}
                        />
                        <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40 scrollbar-thin">
                          {filteredCommunities.length === 0 ? (
                            <p className="text-xs text-muted/40 px-3 py-2">No communities found</p>
                          ) : (
                            filteredCommunities.map((c) => {
                              const checked = form.community_ids.includes(c.id);
                              return (
                                <label
                                  key={c.id}
                                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-accent/5" : "hover:bg-surface-hover/50"
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCommunity(c.id)}
                                    className="rounded accent-[var(--accent)]"
                                  />
                                  <span className="text-sm text-foreground/80">{c.icon_emoji} {c.name}</span>
                                  <span className="text-[10px] text-muted/40 ml-auto">c/{c.slug}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        {form.community_ids.length > 0 && (
                          <p className="text-[11px] text-muted/50 mt-1.5">
                            {form.community_ids.length} selected
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-background/30">
                <div>
                  {initialData && onDelete && (
                    <>
                      {!showDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          Delete persona
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted/60 font-medium uppercase tracking-tight">Confirm?</span>
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-3 py-1.5 text-[11px] font-semibold text-white bg-rose-500 rounded-md hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {isDeleting ? "Deleting..." : "Yes, delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2 py-1.5 text-[11px] text-muted hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs text-muted border border-border/60 rounded-lg hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || showDeleteConfirm}
                    className="px-4 py-2 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Saving…" : initialData ? "Save changes" : "Create persona"}
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