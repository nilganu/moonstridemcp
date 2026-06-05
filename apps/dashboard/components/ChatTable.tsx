"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ChatTableData {
  columns: string[];
  rows: Array<Record<string, string | number>>;
  total: number;
  source: string;
}

const PAGE_SIZE = 20;

/** Renders chat search results as a table, 20 rows per page. */
export function ChatTable({ data }: { data: ChatTableData }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.rows.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const slice = data.rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100/80 dark:bg-slate-800/60">
            <tr>
              {data.columns.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={start + i}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                {data.columns.map((c) => (
                  <td key={c} className="max-w-[16rem] truncate px-2.5 py-1.5">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {data.total.toLocaleString()} result{data.total === 1 ? "" : "s"}
          {data.rows.length < data.total && ` (showing first ${data.rows.length})`}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost px-2 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            className="btn-ghost px-2 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
