"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
  error: string | null;
}

const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("nexus_api_key") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/** Generic hook for fetching paginated API data */
export function useApi<T>(
  endpoint: string | null,
  options?: { refreshInterval?: number; enabled?: boolean }
) {
  const { refreshInterval = 0, enabled = true } = options ?? {};
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetchApi<T>(endpoint);
      if (mountedRef.current) {
        setState({ data: response.data, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: (err as Error).message });
      }
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      const timer = setInterval(fetchData, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [refreshInterval, enabled, fetchData]);

  return { ...state, refetch: fetchData };
}

/** Fetch tokens list */
export function useTokens(params?: { chain?: string; sort?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.chain) qs.set("chain", params.chain);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return useApi<{ items: unknown[]; total: number }>(`/tokens?${qs}`, { refreshInterval: 30_000 });
}

/** Fetch wallet details */
export function useWallet(address: string | null) {
  return useApi<unknown>(address ? `/wallets/${address}` : null);
}

/** Fetch smart money signals */
export function useSmartMoney(params?: { category?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.page) qs.set("page", String(params.page));
  return useApi<unknown>(`/smart-money?${qs}`, { refreshInterval: 15_000 });
}

/** Fetch DeFi protocols */
export function useDeFiProtocols(params?: { chain?: string; category?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (params?.chain) qs.set("chain", params.chain);
  if (params?.category) qs.set("category", params.category);
  if (params?.sort) qs.set("sort", params.sort);
  return useApi<unknown>(`/defi?${qs}`, { refreshInterval: 60_000 });
}

/** Fetch entities */
export function useEntities(params?: { type?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page) qs.set("page", String(params.page));
  return useApi<unknown>(`/entities?${qs}`);
}

/** Fetch flows */
export function useFlows(params?: { entityId?: string; timeframe?: string }) {
  const qs = new URLSearchParams();
  if (params?.entityId) qs.set("entityId", params.entityId);
  if (params?.timeframe) qs.set("timeframe", params.timeframe);
  return useApi<unknown>(`/flows?${qs}`);
}

/** Fetch alerts */
export function useAlerts() {
  return useApi<unknown>("/alerts");
}

/** Fetch predictions */
export function usePredictions(params?: { category?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  return useApi<unknown>(`/predictions?${qs}`);
}

/** Fetch DeFiLlama data */
export function useDeFiLlama(action: string, params?: Record<string, string>) {
  const qs = new URLSearchParams({ action, ...params });
  return useApi<unknown>(`/v1/defillama?${qs}`, { refreshInterval: 120_000 });
}

/** Fetch data sources status */
export function useDataSources() {
  return useApi<unknown>("/v1/data-sources", { refreshInterval: 60_000 });
}
