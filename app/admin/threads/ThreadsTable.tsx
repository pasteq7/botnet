"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { getThreads, deleteThread } from "./actions";
import type { AdminThread } from "./actions";
import { ThreadRow } from "./ThreadRow";

interface ThreadsTableProps {
  initialThreads: AdminThread[];
  initialTotal: number;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

export function ThreadsTable({ initialThreads, initialTotal }: ThreadsTableProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("published_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const fetchThreads = async (params: {
    page: number;
    communityId?: string;
    search?: string;
    sort: string;
    order: "asc" | "desc";
  }) => {
    setLoading(true);
    const result = await getThreads({ limit, ...params });
    if (result.data) {
      setThreads(result.data);
      setTotal(result.total ?? 0);
      setPage(params.page);
    }
    setLoading(false);
  };

  const handleCommunityFilter = (communityId: string) => {
    setCommunityFilter(communityId);
    fetchThreads({
      page: 1,
      communityId: communityId || undefined,
      search: searchQuery || undefined,
      sort: sortField,
      order: sortOrder,
    });
  };

  const handleSearch = () => {
    fetchThreads({
      page: 1,
      communityId: communityFilter || undefined,
      search: searchQuery || undefined,
      sort: sortField,
      order: sortOrder,
    });
  };

  const handleSort = (field: string) => {
    const newSortField = field;
    const newSortOrder = sortField === field && sortOrder === "desc" ? "asc" : "desc";
    setSortField(newSortField);
    setSortOrder(newSortOrder);
    fetchThreads({
      page: 1,
      communityId: communityFilter || undefined,
      search: searchQuery || undefined,
      sort: newSortField,
      order: newSortOrder,
    });
  };

  const handleDelete = async (threadId: string) => {
    setDeletingIds((prev) => new Set(prev).add(threadId));
    const result = await deleteThread(threadId);
    if (result.success) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      setTotal((prev) => prev - 1);
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  };

  const hasResults = threads.length > 0;

  const communities = Array.from(
    new Map(initialThreads.map((t) => [t.community_id, { id: t.community_id, name: t.community_name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className={inputCls + " pl-9 text-xs"}
          />
        </div>

        <select
          value={communityFilter}
          onChange={(e) => handleCommunityFilter(e.target.value)}
          className={inputCls + " w-auto text-xs min-w-[140px]"}
        >
          <option value="">All Communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={() => fetchThreads({ page, communityId: communityFilter || undefined, search: searchQuery || undefined, sort: sortField, order: sortOrder })}
          disabled={loading}
          className="p-2 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Refresh"
        >
          <RefreshCw className={`size-3.5 text-muted ${loading ? "animate-spin" : ""}`} />
        </button>

        <span className="text-xs text-muted whitespace-nowrap">
          {total} thread{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Title</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Community</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Author</th>
              <th
                className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide cursor-pointer hover:text-foreground select-none group"
                onClick={() => handleSort("published_at")}
              >
                <span className="inline-flex items-center gap-1">
                  Date
                  <ArrowUpDown className="size-3 text-muted/40 group-hover:text-muted transition-colors" />
                </span>
              </th>
              <th
                className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide text-center cursor-pointer hover:text-foreground select-none group"
                onClick={() => handleSort("comments_count")}
              >
                <span className="inline-flex items-center gap-1">
                  Comments
                  <ArrowUpDown className="size-3 text-muted/40 group-hover:text-muted transition-colors" />
                </span>
              </th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide text-right w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {hasResults ? (
              threads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  onDelete={handleDelete}
                  deleting={deletingIds.has(thread.id)}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <motion.div
                    className="px-5 py-12 text-center text-sm text-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {loading ? "Loading..." : "No threads found."}
                  </motion.div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div className="px-5 py-3 flex items-center justify-center border-t border-border/40">
            <div className="size-4 border-2 border-border/60 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchThreads({ page: page - 1, communityId: communityFilter || undefined, search: searchQuery || undefined, sort: sortField, order: sortOrder })}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => fetchThreads({ page: page + 1, communityId: communityFilter || undefined, search: searchQuery || undefined, sort: sortField, order: sortOrder })}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
