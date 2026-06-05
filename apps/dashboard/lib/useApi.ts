"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/** Build a query string from a params object, skipping empty values. */
export function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) usp.set(k, v.join(","));
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/**
 * Fetch a Moonstride endpoint through the local proxy.
 * @param endpointId registry id, e.g. "bookings.count"
 * @param params query params
 * @param enabled set false to defer the request
 */
export function useApi<T = unknown>(
  endpointId: string,
  params: Record<string, unknown> = {},
  enabled = true,
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = `${endpointId}${toQuery(params)}`;
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    fetch(`/api/moonstride/${endpointId}${toQuery(params)}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setData(body.data as T);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message ?? String(err));
        setData(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { data, error, loading, refetch: run };
}
