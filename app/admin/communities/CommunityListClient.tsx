// app/admin/communities/CommunityListClient.tsx
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
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleSubmit = async (data: Partial<Community>) => {
    const res = await fetch("/api/admin/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const saved = await res.json();
      setCommunities((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      router.refresh();
    } else {
      const error = await res.json();
      throw new Error(error.error || "Failed to save community");
    }
  };

  const handleCommunityUpdated = (updated: Community) => {
    setCommunities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    router.refresh();
  };

  const handleCommunityDeleted = (communityId: string) => {
    setCommunities((prev) => prev.filter((c) => c.id !== communityId));
    router.refresh();
  };

  const handleToggleActive = async (community: Community) => {
    setTogglingIds((prev) => new Set(prev).add(community.id));
    const res = await fetch("/api/admin/communities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: community.id, is_active: !community.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      handleCommunityUpdated(updated);
    }
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(community.id);
      return next;
    });
  };

  const handleTrigger = async (communityId: string) => {
    setTriggeringIds((prev) => new Set(prev).add(communityId));
    await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });
    setTimeout(() => {
      setTriggeringIds((prev) => {
        const next = new Set(prev);
        next.delete(communityId);
        return next;
      });
    }, 2000);
  };

  const handleTriggerAll = async () => {
    setTriggeringAll(true);
    await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: "all" }),
    });
    setTriggeringAll(false);
  };

  const activeCommunities = communities.filter((c) => c.is_active);
  const inactiveCommunities = communities.filter((c) => !c.is_active);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communities</h1>
          <p className="text-sm text-muted mt-1">
            {activeCommunities.length} active · {inactiveCommunities.length} inactive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerAll}
            disabled={triggeringAll || activeCommunities.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:text-foreground hover:border-foreground/30 hover:bg-surface-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {triggeringAll ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                Queuing…
              </>
            ) : (
              <>
                <span>⚡</span>
                Generate all
              </>
            )}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            New community
          </button>
        </div>
      </div>

      {/* Community list */}
      {communities.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-3">🏘️</p>
          <p className="text-foreground font-medium">No communities yet</p>
          <p className="text-sm text-muted mt-1 mb-6">Create your first community to get started.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Add community
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-surface divide-y divide-border">
          {communities.map((community) => {
            const isTriggering = triggeringIds.has(community.id);
            const isToggling = togglingIds.has(community.id);

            return (
              <div
                key={community.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors group"
              >
                {/* Icon + name */}
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-xl shrink-0 border border-border">
                  {community.icon_emoji || "🏘️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{community.name}</span>
                    <span className="text-xs text-muted font-mono shrink-0">c/{community.slug}</span>
                  </div>
                  {community.description && (
                    <p className="text-xs text-muted truncate mt-0.5">{community.description}</p>
                  )}
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(community)}
                  disabled={isToggling}
                  title={community.is_active ? "Click to deactivate" : "Click to activate"}
                  className={`relative shrink-0 w-10 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${community.is_active ? "bg-accent" : "bg-border"
                    } ${isToggling ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${community.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                  />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTrigger(community.id)}
                    disabled={isTriggering || !community.is_active}
                    title={!community.is_active ? "Activate community to trigger" : "Trigger content generation"}
                    className={`p-2 rounded-lg text-sm transition-all ${isTriggering
                        ? "text-muted bg-surface cursor-not-allowed"
                        : community.is_active
                          ? "text-accent hover:bg-accent/10"
                          : "text-border cursor-not-allowed"
                      }`}
                  >
                    {isTriggering ? "⏳" : "⚡"}
                  </button>
                  <button
                    onClick={() => setManageCommunity(community)}
                    className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
                  >
                    Manage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CommunityModal
        key={`create-${isCreateOpen}`}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleSubmit}
        initialData={null}
      />
      <CommunityManageModal
        key={manageCommunity?.id ?? 'closed'}
        isOpen={!!manageCommunity}
        onClose={() => setManageCommunity(null)}
        community={manageCommunity}
        onCommunityUpdated={handleCommunityUpdated}
        onCommunityDeleted={handleCommunityDeleted}
      />
    </div>
  );
}