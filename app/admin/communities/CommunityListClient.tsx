"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Plus, Settings, Users, Loader } from "lucide-react";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import CommunityModal from "@/components/admin/CommunityModal";
import { Toggle } from "@/components/ui/Toggle";
import type { Community } from "@/types";

interface CommunityListClientProps {
  initialCommunities: Community[];
}

export default function CommunityListClient({ initialCommunities }: CommunityListClientProps) {
  const [communities, setCommunities] = useState(initialCommunities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(new Set());
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const openCreate = () => {
    setSelectedCommunity(null);
    setIsModalOpen(true);
  };

  const openManage = (community: Community) => {
    setSelectedCommunity(community);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCommunity(null);
  };

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

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const handleTrigger = async (communityId: string) => {
    setTriggeringIds((prev) => new Set(prev).add(communityId));
    setError(null);
    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showError(body?.error || `Trigger failed (${res.status})`);
    }
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
    setError(null);
    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: "all" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showError(body?.error || `Trigger all failed (${res.status})`);
    }
    setTriggeringAll(false);
  };

  const activeCommunities = communities.filter((c) => c.is_active);
  const inactiveCommunities = communities.filter((c) => !c.is_active);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-light tracking-tight text-foreground">Communities</h1>
          <p className="text-sm text-muted mt-1">
            {activeCommunities.length} active &middot; {inactiveCommunities.length} inactive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerAll}
            disabled={triggeringAll || activeCommunities.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 text-muted hover:text-foreground hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {triggeringAll ? (
              <>
                <Loader className="size-3.5 animate-spin" />
                Queuing&hellip;
              </>
            ) : (
              <>
                <Zap className="size-3.5" />
                Generate all
              </>
            )}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus className="size-3.5" />
            New community
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400">
          <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}

      {communities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
          <Users className="size-8 mx-auto mb-3 text-muted/40" />
          <p className="text-foreground/80 font-medium">No communities yet</p>
          <p className="text-xs text-muted/80 mt-1 mb-5">Create your first community to get started.</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            Add community
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden divide-y divide-border/40">
          {communities.map((community) => {
            const isTriggering = triggeringIds.has(community.id);
            const isToggling = togglingIds.has(community.id);

            return (
              <div
                key={community.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover/50 transition-colors group"
              >
                <CommunityIcon name={community.icon_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{community.name}</span>
                    <span className="text-xs text-muted/90 font-mono shrink-0">c/{community.slug}</span>
                  </div>
                  {community.description && (
                    <p className="text-xs text-muted/80 truncate mt-0.5">{community.description}</p>
                  )}
                </div>

                <Toggle
                  checked={community.is_active}
                  onChange={() => handleToggleActive(community)}
                  disabled={isToggling}
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTrigger(community.id)}
                    disabled={isTriggering || !community.is_active}
                    title={!community.is_active ? "Activate community to trigger" : "Trigger content generation"}
                    className={`p-1.5 rounded-lg text-xs transition-all ${isTriggering
                        ? "text-muted bg-surface cursor-not-allowed"
                        : community.is_active
                          ? "text-accent hover:bg-accent/10"
                          : "text-border/60 cursor-not-allowed"
                      }`}
                  >
                    {isTriggering ? (
                      <Loader className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openManage(community)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted/80 hover:text-foreground hover:bg-background border border-transparent hover:border-border/60 transition-all"
                  >
                    <Settings className="size-3.5" />
                    Manage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CommunityModal
        key={`community-modal-${selectedCommunity?.id ?? 'create'}`}
        isOpen={isModalOpen}
        onClose={closeModal}
        community={selectedCommunity}
        onSubmit={handleSubmit}
        onSuccess={handleCommunityUpdated}
        onDeleted={handleCommunityDeleted}
      />
    </div>
  );
}
