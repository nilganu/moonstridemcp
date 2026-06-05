"use client";

import { useState } from "react";
import { FilterBar, defaultFilters, filtersToParams } from "@/components/FilterBar";
import { AutoTable, ErrorNote, KpiCard, PageHeader, Spinner } from "@/components/ui";
import { MetricChart, type ChartDatum } from "@/components/MetricChart";
import { useApi } from "@/lib/useApi";
import { asRows, pickNumber } from "@/lib/format";

/** Try to turn pipeline-stage data into chart points. */
function stagesToChart(data: unknown): ChartDatum[] {
  const rows = asRows(data) ?? [];
  return rows
    .map((r) => {
      const name =
        (r.name as string) ?? (r.stage as string) ?? (r.label as string) ?? "?";
      const value =
        pickNumber(r, ["count", "total", "enquiries", "value"]) ?? 0;
      return { name: String(name), value };
    })
    .slice(0, 12);
}

export default function EnquiriesPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const params = filtersToParams(filters);

  const count = useApi("enquiries.count", params);
  const stages = useApi("enquiries.pipelineStages", {});
  const search = useApi("enquiries.search", { ...params, limit: 50 });

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Pipeline and recent enquiries" />
      <FilterBar value={filters} onChange={setFilters} showQuote={false} showSearch />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Enquiries" value={pickNumber(count.data)} loading={count.loading} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">
            Pipeline stages
          </h2>
          {stages.loading ? (
            <Spinner />
          ) : stages.error ? (
            <ErrorNote message={stages.error} />
          ) : (
            <MetricChart data={stagesToChart(stages.data)} />
          )}
        </div>
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">
            Stage details
          </h2>
          <AutoTable data={stages.data} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Results</h2>
        {search.loading ? (
          <Spinner />
        ) : search.error ? (
          <ErrorNote message={search.error} />
        ) : (
          <AutoTable data={search.data} />
        )}
      </div>
    </div>
  );
}
