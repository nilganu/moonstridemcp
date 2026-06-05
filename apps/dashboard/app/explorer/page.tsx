"use client";

import { useMemo, useState } from "react";
import { listEndpoints, type EndpointDef } from "@moonstride/api-client";
import { AutoTable, ErrorNote, JsonView, PageHeader, Spinner } from "@/components/ui";
import { toQuery } from "@/lib/useApi";

const ALL = listEndpoints();

/** Common, human-friendly param fields offered for any endpoint. */
const PARAM_FIELDS = ["from", "to", "userid", "sellchannelid", "status", "search", "limit"] as const;

export default function ExplorerPage() {
  const categories = useMemo(
    () => Array.from(new Set(ALL.map((e) => e.category))),
    [],
  );
  const [selected, setSelected] = useState<EndpointDef>(ALL[0]!);
  const [params, setParams] = useState<Record<string, string>>({});
  const [view, setView] = useState<"table" | "json">("table");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== ""),
      );
      const res = await fetch(`/api/moonstride/${selected.id}${toQuery(clean)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setResult(body.data);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="API Explorer"
        subtitle="Call any Moonstride endpoint directly"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Endpoint picker */}
        <div className="card max-h-[80vh] overflow-auto">
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                {cat}
              </div>
              {ALL.filter((e) => e.category === cat).map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelected(e);
                    setResult(null);
                    setError(null);
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                    e.id === selected.id
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Request + response */}
        <div>
          <div className="card mb-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                {selected.method}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {selected.path}
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-500">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PARAM_FIELDS.map((f) => (
                <div key={f}>
                  <label className="label">{f}</label>
                  <input
                    className="input"
                    value={params[f] ?? ""}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, [f]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button className="btn-brand" onClick={run} disabled={loading}>
                {loading ? "Running…" : "Run"}
              </button>
              <div className="ml-auto flex gap-1">
                <button
                  className={view === "table" ? "btn-brand" : "btn-ghost"}
                  onClick={() => setView("table")}
                >
                  Table
                </button>
                <button
                  className={view === "json" ? "btn-brand" : "btn-ghost"}
                  onClick={() => setView("json")}
                >
                  JSON
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <Spinner />
            ) : error ? (
              <ErrorNote message={error} />
            ) : result === null ? (
              <div className="text-sm text-slate-400">Run a request to see results.</div>
            ) : view === "table" ? (
              <AutoTable data={result} />
            ) : (
              <JsonView data={result} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
