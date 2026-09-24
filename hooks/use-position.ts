"use client";
import { useCallback, useRef, useState } from "react";
import type { Address } from "viem";
import type { Position, YieldStrategy } from "@/lib/yield-strategy";

export function usePosition(strategy: YieldStrategy) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(
    async (owner: Address) => {
      const requestId = ++requestRef.current;
      try {
        const p = await strategy.readPosition(owner);
        if (requestId !== requestRef.current) return; // a newer account/chain change superseded this read
        setPosition(p);
        setError(false);
      } catch {
        if (requestId !== requestRef.current) return;
        setError(true);
      }
    },
    [strategy],
  );

  // Unknown, not zero: clearing must never leave a previous account's numbers on
  // screen, and bumping the id drops any read still in flight for the old account.
  const reset = useCallback(() => {
    requestRef.current++;
    setPosition(null);
    setError(false);
  }, []);

  return { position, error, load, reset };
}
