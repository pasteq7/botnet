"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, ArrowUpDown, Trash2 } from "lucide-react";
import { getThreads, deleteThread, deleteThreads } from "./actions";
import type { AdminThread } from "./actions";
import { ThreadRow } from "./ThreadRow";
import { Pagination } from "@/components/ui/Pagination";

interface CommunityOption {
  id: string;
  name: string;
}

interface ThreadsTableProps {
  initialThreads: AdminThread[];
  initialTotal: number;
  communities: CommunityOption[];
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

export function ThreadsTable({ initialThreads, initialTotal, communities }: ThreadsTableProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("published_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const limit = 10;
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
      setSelectedIds(new Set());
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

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === threads.length) return new Set();
      return new Set(threads.map((t) => t.id));
    });
  }, [threads]);

  const handleDelete = async (threadId: string) => {
    setDeletingIds((prev) => new Set(prev).add(threadId));
    const result = await deleteThread(threadId);
    if (result.success) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(threadId); return n; });
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    const ids = Array.from(selectedIds);
    const result = await deleteThreads(ids);
    if (result.success) {
      setThreads((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setTotal((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
    }
    setBatchDeleting(false);
  };

  const hasResults = threads.length > 0;
  const allSelected = hasResults && selectedIds.size === threads.length;

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
            className={inputCls + " pl-9"}
          />
        </div>

        <select
          value={communityFilter}
          onChange={(e) => handleCommunityFilter(e.target.value)}
          className={inputCls + " w-auto min-w-[140px]"}
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

      {selectedIds.size > 0 && (
        <motion.div
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-sm text-rose-300 font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25 hover:bg-rose-500/25 transition-colors disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            {batchDeleting ? "Deleting..." : "Delete selected"}
          </button>
        </motion.div>
      )}

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="size-4 rounded border-border/60 bg-surface text-accent focus:ring-accent/30 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Title</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Community</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Author</th>
              <th
                className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide cursor-pointer hover:text-foreground select-none group"
                onClick={() => handleSort("published_at")}
              >
                <span className="inline-flex items-center gap-1">
                  Date
                  <ArrowUpDown className="size-3 text-muted/40 group-hover:text-muted transition-colors" />
                </span>
              </th>
              <th
                className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide text-center cursor-pointer hover:text-foreground select-none group"
                onClick={() => handleSort("comments_count")}
              >
                <span className="inline-flex items-center gap-1">
                  Comments
                  <ArrowUpDown className="size-3 text-muted/40 group-hover:text-muted transition-colors" />
                </span>
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide text-right w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {hasResults ? (
              threads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  selected={selectedIds.has(thread.id)}
                  onToggleSelect={handleToggleSelect}
                  onDelete={handleDelete}
                  deleting={deletingIds.has(thread.id)}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7}>
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        loading={loading}
        onPageChange={(newPage) =>
          fetchThreads({ page: newPage, communityId: communityFilter || undefined, search: searchQuery || undefined, sort: sortField, order: sortOrder })
        }
      />
    </div>
  );
}
