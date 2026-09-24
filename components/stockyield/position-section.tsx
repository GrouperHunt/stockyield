import { formatUnits, type Address } from "viem";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cash, pct } from "@/lib/format";
import type { Position, StrategyInfo, StrategyMetrics } from "@/lib/yield-strategy";
import { PositionStat } from "./atoms";

export function PositionSection({ info, address, position, error, metrics, onRefresh }: { info: StrategyInfo; address: Address | null; position: Position | null; error: boolean; metrics: StrategyMetrics | null; onRefresh: () => void }) {
  const value = position ? cash(Number(formatUnits(position.assets, info.asset.decimals)) * (metrics?.assetPriceUsd ?? 1)) : "";
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-12 lg:px-8">
      <div className="rounded-[26px] border bg-[#fcfdf9] p-6 md:p-8">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm text-[#718078]">My position</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {!address ? "Connect to view your position" : error ? "Unable to load your position" : !position ? "Loading position…" : `${value} supplied`}
            </h2>
          </div>
          {address && <Button variant="outline" onClick={onRefresh} className="rounded-full"><RefreshCw size={15} className="mr-2" />Refresh</Button>}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PositionStat l="Current value" v={!address ? "—" : error ? "Unavailable" : !position ? "Loading…" : value} />
          <PositionStat l="Vault shares" v={!address ? "—" : error ? "Unavailable" : !position ? "Loading…" : Number(formatUnits(position.shares, info.shareDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
          <PositionStat l="Current APY" v={pct(metrics?.netApy)} />
        </div>
        <p className="mt-5 text-xs text-[#8a978f]">Net deposits and realized yield aren&apos;t shown because they require a verified transfer history for your shares, which isn&apos;t available yet. This is your current position value only, not a profit figure.</p>
      </div>
    </section>
  );
}
