"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SubredditModal from "@/components/admin/SubredditModal";
import type { Subreddit } from "@/types";

interface SubredditListClientProps {
  initialSubreddits: Subreddit[];
  totalPersonas: number;
}

export default function SubredditListClient({ initialSubreddits, totalPersonas }: SubredditListClientProps) {
  const [subreddits, setSubreddits] = useState(initialSubreddits);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subreddit | null>(null);
  const router = useRouter();

  const handleAddSub = () => {
    setEditingSub(null);
    setIsModalOpen(true);
  };

  const handleEditSub = (sub: Subreddit) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Subreddit>) => {
    const method = editingSub ? "PATCH" : "POST";
    const body = editingSub ? { id: editingSub.id, ...data } : data;

    const res = await fetch("/api/admin/subreddits", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const savedSub = await res.json();
      if (editingSub) {
        setSubreddits(subreddits.map(s => s.id === savedSub.id ? savedSub : s));
      } else {
        setSubreddits([...subreddits, savedSub].sort((a, b) => a.name.localeCompare(b.name)));
      }
      router.refresh();
    } else {
      const error = await res.json();
      throw new Error(error.error || "Failed to save subreddit");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-[#4A443F]">Subreddits</h1>
          <p className="text-[#828A7A] mt-2">Manage your target communities</p>
        </div>
        <button 
          onClick={handleAddSub}
          className="bg-[#828A7A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D7566] transition-colors"
        >
          Add New Sub
        </button>
      </header>

      <div className="bg-white rounded-xl border border-[#E5E1DA] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9F8F6] border-b border-[#E5E1DA]">
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Subreddit</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Persona Pool</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1DA]">
            {subreddits.map((sub) => (
              <tr key={sub.id} className="hover:bg-[#F9F8F6] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl bg-[#F5F2ED] w-10 h-10 flex items-center justify-center rounded-lg">
                      {sub.icon_emoji || "🏘️"}
                    </span>
                    <div>
                      <p className="font-medium text-[#4A443F]">{sub.name}</p>
                      <p className="text-xs text-[#828A7A]">r/{sub.slug}</p>
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
                <td className="px-6 py-4 text-sm text-[#4A443F]">
                  {totalPersonas} Global
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-4 items-center">
                  <button
                    onClick={() => handleEditSub(sub)}
                    className="text-[#828A7A] hover:text-[#4A443F] text-xs font-medium uppercase tracking-wider"
                  >
                    Edit Config
                  </button>
                  <Link 
                    href={`/admin/subreddits/${sub.id}`}
                    className="text-[#828A7A] hover:text-[#4A443F] text-sm font-medium underline underline-offset-4 decoration-[#E5E1DA] hover:decoration-[#828A7A] transition-all"
                  >
                    Manage & Trigger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubredditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingSub}
      />
    </div>
  );
}
