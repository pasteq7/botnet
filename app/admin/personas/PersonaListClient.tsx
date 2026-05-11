"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCircle, Edit3 } from "lucide-react";
import PersonaModal from "@/components/admin/PersonaModal";
import type { Persona } from "@/types";

interface PersonaListClientProps {
  initialPersonas: Persona[];
}

const ARCHETYPE_LABELS: Record<string, string> = {
  neutral: "Neutral",
  skeptic: "Skeptic",
  enthusiast: "Enthusiast",
  storyteller: "Storyteller",
  expert: "Expert",
  provocateur: "Provocateur",
  optimist: "Optimist",
};

export default function PersonaListClient({ initialPersonas }: PersonaListClientProps) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const router = useRouter();

  const handleCreatePersona = () => {
    setEditingPersona(null);
    setIsModalOpen(true);
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Persona>) => {
    const method = editingPersona ? "PATCH" : "POST";
    const body = editingPersona ? { id: editingPersona.id, ...data } : data;

    const res = await fetch("/api/admin/personas", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const savedPersona = await res.json();
      if (editingPersona) {
        setPersonas(personas.map(p => p.id === savedPersona.id ? savedPersona : p));
      } else {
        setPersonas([...personas, savedPersona].sort((a, b) => a.username.localeCompare(b.username)));
      }
      router.refresh();
    } else {
      const error = await res.json();
      throw new Error(error.error || "Failed to save persona");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-light tracking-tight text-foreground">AI Personas</h1>
          <p className="text-sm text-muted mt-1">Manage the digital souls of your botnet</p>
        </div>
        <button
          onClick={handleCreatePersona}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="size-3.5" />
          New persona
        </button>
      </div>

      {personas.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
          <UserCircle className="size-8 mx-auto mb-3 text-muted/40" />
          <p className="text-foreground/60 font-medium">No personas yet</p>
          <p className="text-xs text-muted/60 mt-1 mb-5">Create your first AI persona to get started.</p>
          <button
            onClick={handleCreatePersona}
            className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            Add persona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personas.map((persona) => {
            const scopeLabel = persona.scope === "scoped" ? "Scoped" : "Global";
            const communitiesList = persona.persona_communities
              ?.map(pc => pc.communities?.name || pc.community_id)
              .join(", ");

            return (
              <div
                key={persona.id}
                className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden group"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-surface-hover flex items-center justify-center text-lg">
                        <UserCircle className="size-5 text-muted" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground/90 truncate">{persona.username}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            persona.scope === "scoped"
                              ? "text-blue-400 bg-blue-500/10"
                              : "text-emerald-400 bg-emerald-500/10"
                          }`}>
                            {scopeLabel}
                          </span>
                          {persona.archetype && (
                            <span className="text-[10px] text-muted/60">
                              {ARCHETYPE_LABELS[persona.archetype] ?? persona.archetype}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditPersona(persona)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-all"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                  </div>

                  {persona.personality_prompt && (
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted/80 leading-relaxed line-clamp-3 italic">
                        &ldquo;{persona.personality_prompt}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-border/40">
                    {persona.writing_style ? (
                      <span className="truncate">{persona.writing_style}</span>
                    ) : (
                      <span />
                    )}
                    {communitiesList && (
                      <span className="truncate text-right max-w-[50%]" title={communitiesList}>
                        {communitiesList}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PersonaModal
        key={editingPersona?.id ?? 'create'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingPersona}
      />
    </div>
  );
}
