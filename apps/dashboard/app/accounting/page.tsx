"use client";

import { useState } from "react";
import { FilterBar, defaultFilters, filtersToParams } from "@/components/FilterBar";
import { AutoTable, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/useApi";

export default function AccountingPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const params = filtersToParams(filters);
  const due = useApi("accounting.reports.supplierPaymentsDue", params);

  return (
    <div>
      <PageHeader
        title="Accounting"
        subtitle="Supplier payments due"
      />
      <FilterBar value={filters} onChange={setFilters} showStatus={false} showQuote={false} />
      <div className="card">
        {due.loading ? (
          <Spinner />
        ) : due.error ? (
          <ErrorNote message={due.error} />
        ) : (
          <AutoTable data={due.data} />
        )}
      </div>
    </div>
  );
}
