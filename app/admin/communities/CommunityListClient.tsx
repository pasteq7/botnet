"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CommunityModal from "@/components/admin/CommunityModal";
import type { Community } from "@/types";

interface CommunityListClientProps {
  initialCommunities: Community[];
  totalPersonas: number;
}

export default function CommunityListClient({ initialCommunities, totalPersonas }: CommunityListClientProps) {
  const [communities, setCommunities] = useState(initialCommunities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Community | null>(null);
  const router = useRouter();

  const handleAddCommunity = () => {
    setEditingSub(null);
    setIsModalOpen(true);
  };

  const handleEditCommunity = (community: Community) => {
    setEditingSub(community);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Community>) => {
    const method = editingSub ? "PATCH" : "POST";
    const body = editingSub ? { id: editingSub.id, ...data } : data;

    const res = await fetch("/api/admin/communities", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const savedCommunity = await res.json();
      if (editingSub) {
        setCommunities(communities.map(s => s.id === savedCommunity.id ? savedCommunity : s));
      } else {
        setCommunities([...communities, savedCommunity].sort((a, b) => a.name.localeCompare(b.name)));
      }
      router.refresh();
    } else {
      const error = await res.json();
      throw new Error(error.error || "Failed to save community");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-foreground">Communities</h1>
          <p className="text-muted mt-2">Manage your target communities</p>
        </div>
        <button 
          onClick={handleAddCommunity}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Add New Community
        </button>
      </header>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-sm font-medium text-muted">Community</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Persona Pool</th>
              <th className="px-6 py-4 text-sm font-medium text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {communities.map((sub) => (
              <tr key={sub.id} className="hover:bg-surface-hover transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl bg-surface w-10 h-10 flex items-center justify-center rounded-lg">
                      {sub.icon_emoji || "🏘️"}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{sub.name}</p>
                      <p className="text-xs text-muted">c/{sub.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    sub.is_active 
                      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" 
                      : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                  }`}>
                    {sub.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {totalPersonas} Global
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-4 items-center">
                  <button
                    onClick={() => handleEditCommunity(sub)}
                    className="text-muted hover:text-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Edit Config
                  </button>
                  <Link 
                    href={`/admin/communities/${sub.id}`}
                    className="text-muted hover:text-foreground text-sm font-medium underline underline-offset-4 decoration-border hover:decoration-accent transition-all"
                  >
                    Manage & Trigger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CommunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingSub}
      />
    </div>
  );
}
