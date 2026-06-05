"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Search, Code2 } from "lucide-react";
import { listEndpoints, toToolName, type EndpointDef } from "@moonstride/api-client";
import { describeSchema, type ParamInfo } from "@/lib/describeSchema";

const ENDPOINTS = listEndpoints();

interface ToolItem {
  id: string;
  tool: string;
  category: string;
  label: string;
  method: string;
  path: string;
  description: string;
  params: ParamInfo[];
  paramTarget: string;
}

function buildItem(e: EndpointDef): ToolItem {
  return {
    id: e.id,
    tool: toToolName(e.id),
    category: e.category,
    label: e.label,
    method: e.method,
    path: e.path,
    description: e.description,
    params: describeSchema(e.input),
    paramTarget: e.paramTarget ?? (e.method === "GET" ? "query" : "body"),
  };
}

const META: ToolItem[] = [
  {
    id: "list_endpoints", tool: "moonstride_list_endpoints", category: "Meta",
    label: "List endpoints", method: "—", path: "(registry)",
    description: "Discover every available endpoint/tool, optionally filtered by category.",
    params: [{ name: "category", type: "string", required: false, description: "Optional category filter, e.g. Bookings" }],
    paramTarget: "—",
  },
  {
    id: "get_reference", tool: "moonstride_get_reference", category: "Meta",
    label: "Get reference data", method: "—", path: "(reference)",
    description: "Fetch a reference set used across the app.",
    params: [{ name: "kind", type: "booking-statuses | enquiry-statuses | pipeline-stages | task-enums | currencies | users | sell-channels", required: true, description: "Which reference set to fetch" }],
    paramTarget: "—",
  },
];

const ALL: ToolItem[] = [...ENDPOINTS.map(buildItem), ...META];

function MethodBadge({ method }: { method: string }) {
  const color =
    method === "GET"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : method === "POST"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${color}`}>{method}</span>;
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      title="Copy"
    >
      {done ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      {label}
    </button>
  );
}

export default function ToolsPage() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>(ALL[0]!.id);
  const [origin, setOrigin] = useState("https://your-host");
  useEffect(() => setOrigin(window.location.origin), []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ALL.filter((x) => !t || x.tool.toLowerCase().includes(t) || x.label.toLowerCase().includes(t) || x.description.toLowerCase().includes(t) || x.category.toLowerCase().includes(t));
  }, [q]);

  const categories = useMemo(() => Array.from(new Set(filtered.map((x) => x.category))), [filtered]);
  const selected = ALL.find((x) => x.id === selectedId) ?? filtered[0] ?? ALL[0]!;
  const embedSnippet = `<script src="${origin}/embed.js"\n        data-host="${origin}"\n        data-key="YOUR_WIDGET_KEY"></script>`;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Reference</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ENDPOINTS.length + META.length} tools exposed by the Moonstride MCP server · shared 1:1 with the dashboard
          </p>
        </div>
        <details className="text-sm">
          <summary className="btn-ghost cursor-pointer select-none">
            <Code2 size={14} className="mr-1 inline text-brand" /> Embed widget
          </summary>
          <div className="absolute right-10 z-10 mt-2 w-[28rem] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Paste on any page</span>
              <CopyBtn value={embedSnippet} label="Copy" />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{embedSnippet}</pre>
          </div>
        </details>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
        {/* ── Left nav (docs style) ── */}
        <aside className="overflow-y-auto border-b border-slate-200 p-4 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{cat}</div>
              {filtered.filter((x) => x.category === cat).map((x) => (
                <button
                  key={x.id}
                  onClick={() => setSelectedId(x.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    x.id === selected.id
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <MethodBadge method={x.method} />
                  <span className="truncate">{x.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Detail pane (docs style) ── */}
        <main className="overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {selected.category}
            </div>
            <h2 className="mb-3 text-xl font-bold">{selected.label}</h2>

            {/* method + endpoint URL */}
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
              <MethodBadge method={selected.method} />
              <code className="flex-1 truncate text-sm">{selected.path}</code>
              <CopyBtn value={selected.path} />
            </div>

            <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{selected.description}</p>

            {/* MCP tool name */}
            <div className="mb-5">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">MCP tool</div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100">
                <span className="flex-1">{selected.tool}</span>
                <CopyBtn value={selected.tool} />
              </div>
            </div>

            {/* Headers */}
            <div className="mb-5">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Headers</div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4 font-mono text-xs">token</td>
                    <td className="py-2 pr-4"><span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">required</span></td>
                    <td className="py-2 text-slate-500">Access token (generated & refreshed automatically by the client).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Parameters */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Parameters</span>
                {selected.method !== "—" && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
                    {selected.paramTarget === "split" ? "query + body filter" : selected.paramTarget === "body" ? "JSON body" : "query string"}
                  </span>
                )}
              </div>
              {selected.params.length === 0 ? (
                <p className="text-sm text-slate-400">No parameters.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Parameter</th>
                        <th className="px-3 py-2 text-left font-semibold">Type</th>
                        <th className="px-3 py-2 text-left font-semibold">Required</th>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.params.map((p) => (
                        <tr key={p.name} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{p.name}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{p.type}</td>
                          <td className="px-3 py-2">
                            {p.required ? (
                              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">required</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">optional</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
