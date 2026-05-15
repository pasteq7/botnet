"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, loading, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const baseBtn =
    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const activeBtn = `${baseBtn} border-accent/40 bg-accent/10 text-accent`;
  const inactiveBtn = `${baseBtn} border-border/60 bg-surface hover:bg-surface-hover text-muted`;

  return (
    <div className="flex items-center justify-between text-xs text-muted">
      <span>{total} total</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || loading}
          className={inactiveBtn}
        >
          First
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className={inactiveBtn}
        >
          Previous
        </button>
        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-muted/40 select-none">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              className={p === page ? activeBtn : inactiveBtn}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className={inactiveBtn}
        >
          Next
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || loading}
          className={inactiveBtn}
        >
          Last
        </button>
      </div>
    </div>
  );
}
