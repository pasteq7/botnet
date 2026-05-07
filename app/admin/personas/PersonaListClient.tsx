"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonaModal from "@/components/admin/PersonaModal";
import type { Persona } from "@/types";

interface PersonaListClientProps {
  initialPersonas: Persona[];
}

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
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-foreground">AI Personas</h1>
          <p className="text-muted mt-2">Manage the digital souls of your botnet</p>
        </div>
        <button 
          onClick={handleCreatePersona}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Create Persona
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => (
          <div key={persona.id} className="bg-surface p-6 rounded-xl border border-border hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
                👤
              </div>
              <button 
                onClick={() => handleEditPersona(persona)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-foreground text-xs font-medium uppercase tracking-widest"
              >
                Edit
              </button>
            </div>
            
            <h3 className="font-medium text-foreground mb-1">{persona.username}</h3>
            <p className="text-xs text-muted mb-4">Universal Persona &middot; Global</p>
            
            {persona.writing_style && (
              <div className="mb-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted">Style</span>
                <p className="text-xs text-foreground mt-0.5">{persona.writing_style}</p>
              </div>
            )}

            <div className="bg-surface p-3 rounded-lg">
              <p className="text-xs italic text-foreground leading-relaxed line-clamp-3">
                &ldquo;{persona.personality_prompt}&rdquo;
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                {persona.archetype && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted bg-surface px-2 py-0.5 rounded">
                    {persona.archetype}
                  </span>
                )}
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-400"></div>
                  <span className="text-[10px] text-muted">Ready</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PersonaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingPersona}
      />
    </div>
  );
}
