"use client";

import { Loader2 } from "lucide-react";
import { asRows, compact, inferColumns } from "@/lib/format";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={16} /> {label ?? "Loading…"}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  loading,
  hint,
}: {
  label: string;
  value: number | string | null;
  loading?: boolean;
  hint?: string;
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? compact(value)
        : value;
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">
        {loading ? <span className="text-slate-300">…</span> : display}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

/** Render an arbitrary API payload as a table when it looks tabular, else JSON. */
export function AutoTable({ data }: { data: unknown }) {
  const rows = asRows(data);
  if (!rows || rows.length === 0) {
    return <JsonView data={data} />;
  }
  const cols = inferColumns(rows);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, i) => (
            <tr
              key={i}
              className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              {cols.map((c) => (
                <td key={c} className="max-w-xs truncate px-3 py-2">
                  {renderCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 && (
        <div className="px-3 py-2 text-xs text-slate-400">
          Showing first 100 of {rows.length} rows.
        </div>
      )}
    </div>
  );
}

function renderCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function JsonView({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
