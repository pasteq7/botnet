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
          <h1 className="text-3xl font-light text-[#4A443F]">AI Personas</h1>
          <p className="text-[#828A7A] mt-2">Manage the digital souls of your botnet</p>
        </div>
        <button 
          onClick={handleCreatePersona}
          className="bg-[#828A7A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D7566] transition-colors"
        >
          Create Persona
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => (
          <div key={persona.id} className="bg-white p-6 rounded-xl border border-[#E5E1DA] hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-[#F5F2ED] rounded-full flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
                👤
              </div>
              <button 
                onClick={() => handleEditPersona(persona)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#828A7A] hover:text-[#4A443F] text-xs font-medium uppercase tracking-widest"
              >
                Edit
              </button>
            </div>
            
            <h3 className="font-medium text-[#4A443F] mb-1">{persona.username}</h3>
            <p className="text-xs text-[#828A7A] mb-4">Universal Persona &middot; Global</p>
            
            {persona.writing_style && (
              <div className="mb-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#828A7A]">Style</span>
                <p className="text-xs text-[#4A443F] mt-0.5">{persona.writing_style}</p>
              </div>
            )}

            <div className="bg-[#F9F8F6] p-3 rounded-lg">
              <p className="text-xs italic text-[#4A443F] leading-relaxed line-clamp-3">
                &ldquo;{persona.personality_prompt}&rdquo;
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#F5F2ED] flex justify-between items-center">
              <div className="flex items-center gap-2">
                {persona.archetype && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#828A7A] bg-[#F5F2ED] px-2 py-0.5 rounded">
                    {persona.archetype}
                  </span>
                )}
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-400"></div>
                  <span className="text-[10px] text-[#B5B0A7]">Ready</span>
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
