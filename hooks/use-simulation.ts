"use client";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import type { SimState, TxAction, YieldStrategy } from "@/lib/yield-strategy";

// Live pre-signature simulation shown in Yield Check. Runs (debounced) whenever
// the inputs are valid; `refreshKey` re-runs it after a transaction settles
// (e.g. the allowance changed after an approval).
export function useSimulation(strategy: YieldStrategy, args: { enabled: boolean; owner: Address | null; action: TxAction; amount: bigint; refreshKey: string }) {
  const { enabled, owner, action, amount, refreshKey } = args;
  const [sim, setSim] = useState<SimState>({ status: "idle" });

  useEffect(() => {
    if (!enabled || !owner || amount <= 0n) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- inputs became invalid: drop any previous result so it can't be read as current.
      setSim({ status: "idle" });
      return;
    }
    let cancelled = false;
    setSim({ status: "checking" });
    const t = setTimeout(() => {
      strategy.simulate(action, { owner, amount }).then((r) => !cancelled && setSim(r));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [strategy, enabled, owner, action, amount, refreshKey]);

  return sim;
}
