"use client";

import { useState } from "react";
import { FilterBar, defaultFilters, filtersToParams } from "@/components/FilterBar";
import { KpiCard, PageHeader, ErrorNote } from "@/components/ui";
import { MetricChart, type ChartDatum } from "@/components/MetricChart";
import { useApi } from "@/lib/useApi";
import { pickNumber } from "@/lib/format";

export default function OverviewPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const params = filtersToParams(filters);

  const sales = useApi("bookings.metric.totalSales", params);
  const profit = useApi("bookings.metric.totalProfit", params);
  const bookingCount = useApi("bookings.count", params);
  const enquiryCount = useApi("enquiries.count", params);
  const goal = useApi("bookings.statistics.goal", params);

  const counts: ChartDatum[] = [
    { name: "Bookings", value: pickNumber(bookingCount.data) ?? 0 },
    { name: "Enquiries", value: pickNumber(enquiryCount.data) ?? 0 },
  ];

  const anyError =
    sales.error || profit.error || bookingCount.error || enquiryCount.error;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Key metrics across bookings and enquiries"
      />
      <FilterBar value={filters} onChange={setFilters} />

      {anyError && (
        <div className="mb-4">
          <ErrorNote message={anyError} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total sales" value={pickNumber(sales.data)} loading={sales.loading} />
        <KpiCard label="Total profit" value={pickNumber(profit.data)} loading={profit.loading} />
        <KpiCard label="Bookings" value={pickNumber(bookingCount.data)} loading={bookingCount.loading} />
        <KpiCard label="Enquiries" value={pickNumber(enquiryCount.data)} loading={enquiryCount.loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">
            Volume comparison
          </h2>
          <MetricChart data={counts} />
        </div>
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">Sales goal</h2>
          {goal.loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : goal.error ? (
            <ErrorNote message={goal.error} />
          ) : (
            <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
              {JSON.stringify(goal.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
