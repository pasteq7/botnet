"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import PersonaModal from "@/components/admin/PersonaModal";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import type { Persona } from "@/types";

const ARCHETYPE_LABELS: Record<string, { label: string; color: string }> = {
  neutral: { label: "Neutral", color: "text-muted/70 bg-muted/10" },
  skeptic: { label: "Skeptic", color: "text-rose-400 bg-rose-500/10" },
  enthusiast: { label: "Enthusiast", color: "text-amber-400 bg-amber-500/10" },
  storyteller: { label: "Storyteller", color: "text-violet-400 bg-violet-500/10" },
  expert: { label: "Expert", color: "text-blue-400 bg-blue-500/10" },
  provocateur: { label: "Provocateur", color: "text-orange-400 bg-orange-500/10" },
  optimist: { label: "Optimist", color: "text-emerald-400 bg-emerald-500/10" },
};

export default function PersonaListClient({ initialPersonas }: { initialPersonas: Persona[] }) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "global" | "scoped" | "excluded">("all");
  const router = useRouter();

  const filtered = personas.filter((p) => {
    const matchSearch =
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.archetype?.toLowerCase().includes(search.toLowerCase());
    const matchScope = filterScope === "all" || p.scope === filterScope;
    return matchSearch && matchScope;
  });

  const openCreate = () => { setEditingPersona(null); setIsModalOpen(true); };
  const openEdit = (p: Persona) => { setEditingPersona(p); setIsModalOpen(true); };

  const handleSubmit = async (data: Partial<Persona>) => {
    const method = editingPersona ? "PATCH" : "POST";
    const body = editingPersona ? { id: editingPersona.id, ...data } : data;
    const res = await fetch("/api/admin/personas", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      setPersonas((prev) =>
        editingPersona
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved].sort((a, b) => a.username.localeCompare(b.username))
      );
      router.refresh();
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to save persona");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/personas?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete persona");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light tracking-tight text-foreground">Personas</h1>
          <p className="text-xs text-muted mt-0.5">{personas.length} AI identities</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="size-xl" />
          New persona
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted/50 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search personas…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/60 bg-surface text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border/60 bg-surface">
          {(["all", "global", "scoped", "excluded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterScope(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${filterScope === s
                ? "bg-accent/20 text-accent"
                : "text-muted hover:text-foreground"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted/70 ml-auto">
          {filtered.length} of {personas.length}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
          <p className="text-sm text-muted/80">
            {search || filterScope !== "all" ? "No personas match your filters." : "No personas yet."}
          </p>
          {!search && filterScope === "all" && (
            <button
              onClick={openCreate}
              className="mt-4 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
            >
              Create first persona
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-surface overflow-hidden divide-y divide-border/40">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 px-4 py-2.5 bg-background/40">
            {["Persona", "Archetype", "Scope", "Communities", ""].map((h) => (
              <span key={h} className="text-xs font-semibold text-muted/80 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {filtered.map((persona) => {
            const archetype = ARCHETYPE_LABELS[persona.archetype] ?? { label: persona.archetype, color: "text-muted/70 bg-muted/10" };
            const communities = persona.persona_communities
              ?.map((pc) => pc.communities?.name ?? pc.community_id) ?? [];

            return (
              <div
                key={persona.id}
                onClick={() => openEdit(persona)}
                className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 items-center px-4 py-3 hover:bg-surface-hover/60 cursor-pointer transition-colors group"
              >
                {/* Persona */}
                <div className="flex items-center gap-3 min-w-0">
                  <PersonaAvatar seed={persona.avatar_seed || persona.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{persona.username}</p>
                    {persona.writing_style && (
                      <p className="text-xs text-muted/80 truncate">{persona.writing_style}</p>
                    )}
                  </div>
                </div>

                {/* Archetype */}
                <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${archetype.color}`}>
                  {archetype.label}
                </span>

                {/* Scope */}
                <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${persona.scope === "excluded"
                  ? "text-orange-400 bg-orange-500/10"
                  : persona.scope === "scoped"
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-emerald-400 bg-emerald-500/10"
                  }`}>
                  {persona.scope === "excluded" ? "Excluded" : persona.scope === "scoped" ? "Scoped" : "Global"}
                </span>

                {/* Communities */}
                <div className="flex flex-wrap gap-1 min-w-0">
                  {persona.scope === "global" || (persona.scope === "excluded" && communities.length === 0) ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">All</span>
                  ) : persona.scope === "excluded" ? (
                    <span className="flex flex-wrap gap-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">All except</span>
                      {communities.length <= 2 ? (
                        communities.map((c) => (
                          <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/80 border border-border/40 truncate max-w-[120px]">{c}</span>
                        ))
                      ) : (
                        <>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/80 border border-border/40 truncate max-w-[100px]">{communities[0]}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/70 border border-border/40">+{communities.length - 1}</span>
                        </>
                      )}
                    </span>
                  ) : communities.length === 0 ? (
                    <span className="text-xs text-muted/50">—</span>
                  ) : communities.length <= 2 ? (
                    communities.map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/80 border border-border/40 truncate max-w-[120px]">{c}</span>
                    ))
                  ) : (
                    <>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/80 border border-border/40 truncate max-w-[100px]">{communities[0]}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background text-muted/70 border border-border/40">+{communities.length - 1}</span>
                    </>
                  )}
                </div>

                {/* Edit cue */}
                <span className="text-xs text-muted/50 group-hover:text-muted/80 transition-colors whitespace-nowrap">
                  Edit →
                </span>
              </div>
            );
          })}
        </div>
      )}

      <PersonaModal
        key={editingPersona?.id ?? "create"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        initialData={editingPersona}
      />
    </div>
  );
}