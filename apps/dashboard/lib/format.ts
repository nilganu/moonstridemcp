/** Format a number compactly (e.g. 12.3K, 4.1M). */
export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Format a currency-ish value. */
export function money(n: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** ISO date N days ago / from now, as YYYY-MM-DD. */
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Best-effort extraction of a numeric metric from an unknown API response.
 * Handles { count }, { total }, { value }, { data: {...} }, or a bare number.
 */
export function pickNumber(value: unknown, keys: string[] = ["count", "total", "value", "amount", "totalSales", "totalProfit"]): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("data" in obj) {
      const fromData = pickNumber(obj.data, keys);
      if (fromData !== null) return fromData;
    }
    for (const k of keys) {
      if (typeof obj[k] === "number") return obj[k] as number;
    }
    // First numeric leaf as a fallback.
    for (const v of Object.values(obj)) {
      if (typeof v === "number") return v;
    }
  }
  return null;
}

/** Turn an arbitrary array-of-objects into table columns. */
export function inferColumns(rows: Record<string, unknown>[], max = 8): string[] {
  const seen = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    for (const key of Object.keys(row)) seen.add(key);
    if (seen.size >= max * 2) break;
  }
  return Array.from(seen).slice(0, max);
}

/** Coerce an unknown API payload into an array of row objects, if possible. */
export function asRows(value: unknown): Record<string, unknown>[] | null {
  const v = value && typeof value === "object" && "data" in (value as object)
    ? (value as { data: unknown }).data
    : value;
  if (Array.isArray(v)) {
    return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  if (v && typeof v === "object") {
    // Look for the first array property.
    for (const val of Object.values(v as Record<string, unknown>)) {
      if (Array.isArray(val) && val.every((x) => x && typeof x === "object")) {
        return val as Record<string, unknown>[];
      }
    }
  }
  return null;
}
