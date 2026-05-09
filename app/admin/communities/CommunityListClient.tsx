"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CommunityModal from "@/components/admin/CommunityModal";
import CommunityManageModal from "@/components/admin/CommunityManageModal";
import type { Community } from "@/types";

interface CommunityListClientProps {
  initialCommunities: Community[];
}

export default function CommunityListClient({ initialCommunities }: CommunityListClientProps) {
  const [communities, setCommunities] = useState(initialCommunities);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [manageCommunity, setManageCommunity] = useState<Community | null>(null);
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(new Set());
  const [triggeringAll, setTriggeringAll] = useState(false);
  const router = useRouter();

  const handleAddCommunity = () => {
    setIsCreateOpen(true);
  };

  const handleEditCommunity = (community: Community) => {
    setManageCommunity(community);
  };

  const handleSubmit = async (data: Partial<Community>) => {
    const method = "POST";

    const res = await fetch("/api/admin/communities", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const savedCommunity = await res.json();
      setCommunities([...communities, savedCommunity].sort((a, b) => a.name.localeCompare(b.name)));
      router.refresh();
    } else {
      const error = await res.json();
      throw new Error(error.error || "Failed to save community");
    }
  };

  const handleCommunityUpdated = (updated: Community) => {
    setCommunities(communities.map(s => s.id === updated.id ? updated : s));
    router.refresh();
  };

  const handleTrigger = async (communityId: string) => {
    setTriggeringIds(prev => new Set(prev).add(communityId));

    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });

    if (!res.ok) {
      const result = await res.json();
      console.error("Trigger failed:", result.error);
    }

    setTimeout(() => {
      setTriggeringIds(prev => {
        const next = new Set(prev);
        next.delete(communityId);
        return next;
      });
    }, 2000);
  };

  const handleTriggerAll = async () => {
    setTriggeringAll(true);

    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: "all" }),
    });

    if (!res.ok) {
      const result = await res.json();
      console.error("Trigger all failed:", result.error);
    }

    setTriggeringAll(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-foreground">Communities</h1>
          <p className="text-muted mt-2">Manage your target communities</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerAll}
            disabled={triggeringAll}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-accent text-accent hover:bg-accent hover:text-white transition-all disabled:opacity-50"
          >
            {triggeringAll ? "⏳ Queuing..." : "⚡ Generate All"}
          </button>
          <button
            onClick={handleAddCommunity}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Add New Community
          </button>
        </div>
      </header>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-sm font-medium text-muted">Community</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Status</th>
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
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3 items-center">
                    <button
                      onClick={() => handleTrigger(sub.id)}
                      disabled={triggeringIds.has(sub.id) || !sub.is_active}
                      className={`text-xs font-medium uppercase tracking-wider transition-all ${
                        triggeringIds.has(sub.id)
                          ? "text-muted"
                          : "text-accent hover:text-accent-hover"
                      } ${!sub.is_active ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {triggeringIds.has(sub.id) ? "⏳" : "⚡ Trigger"}
                    </button>
                    <button
                      onClick={() => handleEditCommunity(sub)}
                      className="text-muted hover:text-foreground text-xs font-medium uppercase tracking-wider"
                    >
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CommunityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleSubmit}
        initialData={null}
      />

      <CommunityManageModal
        isOpen={!!manageCommunity}
        onClose={() => setManageCommunity(null)}
        community={manageCommunity}
        onCommunityUpdated={handleCommunityUpdated}
      />
    </div>
  );
}
