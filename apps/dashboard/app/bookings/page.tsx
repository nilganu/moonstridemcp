"use client";

import { useState } from "react";
import { FilterBar, defaultFilters, filtersToParams } from "@/components/FilterBar";
import { AutoTable, ErrorNote, KpiCard, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import { pickNumber } from "@/lib/format";

const REPORTS = [
  { id: "bookings.reports.paymentInstallments", label: "Payment installments" },
  { id: "bookings.ticketingDeadline.search", label: "Ticketing deadlines" },
] as const;

export default function BookingsPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const [report, setReport] = useState<(typeof REPORTS)[number]["id"]>(
    REPORTS[0].id,
  );
  const params = filtersToParams(filters);

  const count = useApi("bookings.count", params);
  const sales = useApi("bookings.metric.totalSales", params);
  const profit = useApi("bookings.metric.totalProfit", params);
  const search = useApi("bookings.search", { ...params, limit: 50 });
  const reportData = useApi(report, params);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Search, metrics and reports" />
      <FilterBar value={filters} onChange={setFilters} showSearch />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Bookings" value={pickNumber(count.data)} loading={count.loading} />
        <KpiCard label="Total sales" value={pickNumber(sales.data)} loading={sales.loading} />
        <KpiCard label="Total profit" value={pickNumber(profit.data)} loading={profit.loading} />
      </div>

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Results</h2>
        {search.loading ? (
          <Spinner />
        ) : search.error ? (
          <ErrorNote message={search.error} />
        ) : (
          <AutoTable data={search.data} />
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              className={r.id === report ? "btn-brand" : "btn-ghost"}
              onClick={() => setReport(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        {reportData.loading ? (
          <Spinner />
        ) : reportData.error ? (
          <ErrorNote message={reportData.error} />
        ) : (
          <AutoTable data={reportData.data} />
        )}
      </div>
    </div>
  );
}
