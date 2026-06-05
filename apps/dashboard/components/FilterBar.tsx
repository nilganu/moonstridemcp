"use client";

import { isoDate } from "@/lib/format";

export interface Filters {
  from: string;
  to: string;
  status: string;
  quote: boolean;
  search: string;
}

export const defaultFilters = (): Filters => ({
  from: isoDate(-30),
  to: isoDate(0),
  status: "",
  quote: false,
  search: "",
});

/** Strip empty fields so they aren't sent as query params. */
export function filtersToParams(f: Filters): Record<string, unknown> {
  const p: Record<string, unknown> = { from: f.from, to: f.to };
  if (f.status) p.status = f.status;
  if (f.quote) p.quote = true;
  if (f.search) p.search = f.search;
  return p;
}

export function FilterBar({
  value,
  onChange,
  showStatus = true,
  showQuote = true,
  showSearch = false,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  showStatus?: boolean;
  showQuote?: boolean;
  showSearch?: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="card mb-6 flex flex-wrap items-end gap-4">
      <div>
        <label className="label">From</label>
        <input
          type="date"
          className="input"
          value={value.from}
          onChange={(e) => set({ from: e.target.value })}
        />
      </div>
      <div>
        <label className="label">To</label>
        <input
          type="date"
          className="input"
          value={value.to}
          onChange={(e) => set({ to: e.target.value })}
        />
      </div>
      {showStatus && (
        <div>
          <label className="label">Status (CSV)</label>
          <input
            className="input w-40"
            placeholder="COMP,CONF"
            value={value.status}
            onChange={(e) => set({ status: e.target.value })}
          />
        </div>
      )}
      {showSearch && (
        <div className="flex-1">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Search…"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
      )}
      {showQuote && (
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={value.quote}
            onChange={(e) => set({ quote: e.target.checked })}
          />
          Quotes
        </label>
      )}
    </div>
  );
}
