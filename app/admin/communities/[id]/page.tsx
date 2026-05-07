"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ContentMode } from "@/types";

const ALL_MODES: ContentMode[] = ["news", "discussion", "tips", "historical", "showcase", "ask"];


interface CommunityFormData {
  id: string;
  slug: string;
  name: string;
  icon_emoji: string;
  topic_prompt: string;
  tone_guidelines: string;
  is_active: boolean;
  refresh_interval_hours: number;
  content_modes: string[];
  content_mode_weights: Record<string, number>;
  language: string;
  language_strict: boolean;
  personas?: Array<{ count: number }>;
}

export default function CommunityEditorPage() {
  const { id } = useParams();
  const [community, setCommunity] = useState<CommunityFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/communities", {
      credentials: "include", // ← ensures cookies are sent
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: CommunityFormData[]) => {
        if (Array.isArray(data)) {
          const found = data.find((s) => s.id === id);
          setCommunity(found ?? null);
        } else {
          console.error("Expected array, got:", data);
          setCommunity(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Community fetch error:", err);
        setMessage({ type: "error", text: `Could not load: ${err.message}` });
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/communities", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: community.id,
        topic_prompt: community.topic_prompt,
        tone_guidelines: community.tone_guidelines,
        is_active: community.is_active,
        refresh_interval_hours: community.refresh_interval_hours,
        content_modes: community.content_modes,
        content_mode_weights: community.content_mode_weights,
        language: community.language,
        language_strict: community.language_strict,
      }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Settings saved successfully" });
    } else {
      setMessage({ type: "error", text: "Failed to save settings" });
    }
    setSaving(false);
  };

  const handleTrigger = async () => {
    if (!community) return;
    setTriggering(true);
    setMessage({ type: "info", text: "Queuing generation job..." });

    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      credentials: "include", // ← add this
      headers: { "Content-Type": "application/json" }, // ← add this too
      body: JSON.stringify({ communityId: community.id }),
    });

    const result = await res.json();

    if (res.ok) {
      setMessage({
        type: "success",
        text: "Generation job queued successfully! Check the logs for results.",
      });
    } else {
      setMessage({ type: "error", text: `Failed to queue: ${result.error || "Unknown error"}` });
    }
    setTriggering(false);
  };

  if (loading) return <div className="text-muted animate-pulse">Loading community settings...</div>;
  if (!community) return <div>Community not found.</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-start">
        <div>
          <Link href="/admin/communities" className="text-xs text-muted hover:text-foreground mb-2 block">
            ← Back to Communities
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{community.icon_emoji}</span>
            <h1 className="text-3xl font-light text-foreground">{community.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/logs"
            className="text-xs text-muted hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            View Logs
          </Link>
          <button
            onClick={handleTrigger}
            disabled={triggering || !community.is_active}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${triggering
              ? "bg-border text-muted cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md"
              }`}
          >
            {triggering ? "⏳ Queuing..." : "⚡ Trigger Generation"}
          </button>
        </div>
      </header>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" :
          message.type === "error" ? "bg-red-50 text-red-700 border border-red-100" :
            "bg-blue-50 text-blue-700 border border-blue-100"
          }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" && <span>✓</span>}
            {message.text}
            {message.type === "success" && (
              <Link href="/admin/logs" className="underline text-green-800 hover:text-green-900 ml-1">
                View audit log →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface p-8 rounded-xl border border-border shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Topic Prompt</label>
              <p className="text-xs text-muted mb-3">Instructions for the AI on what news stories to hunt for.</p>
              <textarea
                value={community.topic_prompt}
                onChange={(e) => setCommunity({ ...community, topic_prompt: e.target.value })}
                rows={4}
                className="w-full rounded-lg border-border text-sm text-foreground focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tone Guidelines</label>
              <p className="text-xs text-muted mb-3">Defines the community personality and interaction style.</p>
              <textarea
                value={community.tone_guidelines}
                onChange={(e) => setCommunity({ ...community, tone_guidelines: e.target.value })}
                rows={4}
                className="w-full rounded-lg border-border text-sm text-foreground focus:ring-accent focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={community.language}
                    onChange={(e) => setCommunity({ ...community, language: e.target.value })}
                    placeholder="en, fr, de..."
                    className="w-24 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={community.language_strict}
                      onChange={(e) => setCommunity({ ...community, language_strict: e.target.checked })}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span className="text-xs text-muted">Strict Enforcement</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">Content Strategy & Weights</label>
                <p className="text-xs text-muted mb-4">Set the relative frequency for each content type. Setting a weight to 0 disables that mode.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_MODES.map((mode) => {
                    const weight = community.content_mode_weights[mode] || 0;
                    const totalWeight = Object.values(community.content_mode_weights).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((weight / totalWeight) * 100);

                    return (
                      <div key={mode} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{mode}</p>
                          <p className="text-[10px] text-muted">{percentage}% share</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={weight}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const newWeights = { ...community.content_mode_weights, [mode]: val };
                              const newModes = Object.entries(newWeights)
                                .filter(([, w]) => w > 0)
                                .map(([m]) => m as ContentMode);
                              
                              setCommunity({ 
                                ...community, 
                                content_mode_weights: newWeights,
                                content_modes: newModes 
                              });
                            }}
                            className="w-20 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={community.is_active}
                    onChange={(e) => setCommunity({ ...community, is_active: e.target.checked })}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-foreground">{community.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Refresh (Hours)</label>
                <input
                  type="number"
                  value={community.refresh_interval_hours}
                  onChange={(e) => setCommunity({ ...community, refresh_interval_hours: parseInt(e.target.value) || 0 })}
                  className="w-20 rounded-lg border-border text-sm text-foreground focus:ring-accent"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <button
                type="submit"
                disabled={saving}
                className="bg-foreground text-background px-6 py-2 rounded-lg text-sm font-medium hover:brightness-125 transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-xl border border-border">
            <h3 className="font-medium text-foreground mb-4">Quick Reference</h3>
            <div className="space-y-4 text-xs text-muted">
              <div>
                <p className="font-bold text-foreground uppercase tracking-wider mb-1">Slug</p>
                <p>c/{community.slug}</p>
              </div>
              <div>
                <p className="font-bold text-foreground uppercase tracking-wider mb-1">Personas</p>
                <p>{community.personas?.[0]?.count ?? 0} active personalities</p>
              </div>
              <div>
                <p className="font-bold text-foreground uppercase tracking-wider mb-1">Last Generated</p>
                <p>2 hours ago (Example)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
