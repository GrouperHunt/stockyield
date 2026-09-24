"use client";
import { useCallback, useEffect, useState } from "react";
import { STRATEGY_STALE_MS } from "@/lib/strategies/steakhouse-usdg/config";
import type { StrategyMetrics, YieldStrategy } from "@/lib/yield-strategy";

export function useMetrics(strategy: YieldStrategy) {
  const [metrics, setMetrics] = useState<StrategyMetrics | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(false);
  const [gatesOpen, setGatesOpen] = useState<boolean | null>(null);
  const [configOk, setConfigOk] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      const r = await strategy.readMetrics();
      setMetrics(r.metrics);
      setFetchedAt(r.fetchedAt);
    } catch {
      setError(true);
    }
  }, [strategy]);

  const loadGates = useCallback(async () => {
    try {
      if (strategy.readAccessOpen) setGatesOpen(await strategy.readAccessOpen());
    } catch {
      setGatesOpen(null);
    }
    try {
      if (strategy.readConfigValid) setConfigOk(await strategy.readConfigValid());
    } catch {
      setConfigOk(null);
    }
  }, [strategy]);

  useEffect(() => {
    if (!fetchedAt) return;
    const check = () => setStale(Date.now() - new Date(fetchedAt).getTime() > STRATEGY_STALE_MS);
    check();
    const i = setInterval(check, 15_000);
    return () => clearInterval(i);
  }, [fetchedAt]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, then a 60s poll; refresh owns its own try/catch and never throws.
    void refresh();
    const i = setInterval(refresh, 60_000);
    return () => clearInterval(i);
  }, [refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read on mount, then a 5-minute poll; loadGates owns its own try/catch and never throws.
    void loadGates();
    const i = setInterval(loadGates, 5 * 60_000);
    return () => clearInterval(i);
  }, [loadGates]);

  return { metrics, fetchedAt, error, stale, gatesOpen, configOk, refresh };
}
