"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface SubredditFormData {
  id: string;
  slug: string;
  name: string;
  icon_emoji: string;
  topic_prompt: string;
  tone_guidelines: string;
  is_active: boolean;
  refresh_interval_hours: number;
  personas?: Array<{ count: number }>;
}

export default function SubredditEditorPage() {
  const { id } = useParams();
  const [sub, setSub] = useState<SubredditFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/subreddits", {
      credentials: "include", // ← ensures cookies are sent
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: SubredditFormData[]) => {
        if (Array.isArray(data)) {
          const found = data.find((s) => s.id === id);
          setSub(found ?? null);
        } else {
          console.error("Expected array, got:", data);
          setSub(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Subreddit fetch error:", err);
        setMessage({ type: "error", text: `Could not load: ${err.message}` });
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/subreddits", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sub.id,
        topic_prompt: sub.topic_prompt,
        tone_guidelines: sub.tone_guidelines,
        is_active: sub.is_active,
        refresh_interval_hours: sub.refresh_interval_hours,
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
    if (!sub) return;
    setTriggering(true);
    setMessage({ type: "info", text: "Queuing generation job..." });

    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      credentials: "include", // ← add this
      headers: { "Content-Type": "application/json" }, // ← add this too
      body: JSON.stringify({ subredditId: sub.id }),
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

  if (loading) return <div className="text-[#828A7A] animate-pulse">Loading subreddit settings...</div>;
  if (!sub) return <div>Subreddit not found.</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-start">
        <div>
          <Link href="/admin/subreddits" className="text-xs text-[#828A7A] hover:text-[#4A443F] mb-2 block">
            ← Back to Subreddits
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sub.icon_emoji}</span>
            <h1 className="text-3xl font-light text-[#4A443F]">{sub.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/logs"
            className="text-xs text-[#828A7A] hover:text-[#4A443F] underline-offset-2 hover:underline transition-colors"
          >
            View Logs
          </Link>
          <button
            onClick={handleTrigger}
            disabled={triggering || !sub.is_active}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${triggering
              ? "bg-[#E5E1DA] text-[#B5B0A7] cursor-not-allowed"
              : "bg-[#828A7A] text-white hover:bg-[#6D7566] shadow-sm hover:shadow-md"
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
        <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-[#E5E1DA] shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#4A443F] mb-2">Topic Prompt</label>
              <p className="text-xs text-[#828A7A] mb-3">Instructions for the AI on what news stories to hunt for.</p>
              <textarea
                value={sub.topic_prompt}
                onChange={(e) => setSub({ ...sub, topic_prompt: e.target.value })}
                rows={4}
                className="w-full rounded-lg border-[#E5E1DA] text-sm text-[#4A443F] focus:ring-[#828A7A] focus:border-[#828A7A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A443F] mb-2">Tone Guidelines</label>
              <p className="text-xs text-[#828A7A] mb-3">Defines the community personality and interaction style.</p>
              <textarea
                value={sub.tone_guidelines}
                onChange={(e) => setSub({ ...sub, tone_guidelines: e.target.value })}
                rows={4}
                className="w-full rounded-lg border-[#E5E1DA] text-sm text-[#4A443F] focus:ring-[#828A7A] focus:border-[#828A7A]"
              />
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4A443F] mb-2">Status</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sub.is_active}
                    onChange={(e) => setSub({ ...sub, is_active: e.target.checked })}
                    className="rounded text-[#828A7A] focus:ring-[#828A7A]"
                  />
                  <span className="text-sm text-[#4A443F]">{sub.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A443F] mb-2">Refresh (Hours)</label>
                <input
                  type="number"
                  value={sub.refresh_interval_hours}
                  onChange={(e) => setSub({ ...sub, refresh_interval_hours: parseInt(e.target.value) || 0 })}
                  className="w-20 rounded-lg border-[#E5E1DA] text-sm text-[#4A443F] focus:ring-[#828A7A]"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-[#F5F2ED]">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#4A443F] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-[#F9F8F6] p-6 rounded-xl border border-[#E5E1DA]">
            <h3 className="font-medium text-[#4A443F] mb-4">Quick Reference</h3>
            <div className="space-y-4 text-xs text-[#828A7A]">
              <div>
                <p className="font-bold text-[#4A443F] uppercase tracking-wider mb-1">Slug</p>
                <p>r/{sub.slug}</p>
              </div>
              <div>
                <p className="font-bold text-[#4A443F] uppercase tracking-wider mb-1">Personas</p>
                <p>{sub.personas?.[0]?.count ?? 0} active personalities</p>
              </div>
              <div>
                <p className="font-bold text-[#4A443F] uppercase tracking-wider mb-1">Last Generated</p>
                <p>2 hours ago (Example)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
