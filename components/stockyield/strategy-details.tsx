import { CircleDollarSign, Clock3, ExternalLink, Landmark, LockKeyhole, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cash, pct, short } from "@/lib/format";
import type { StrategyInfo, StrategyMetrics } from "@/lib/yield-strategy";
import { Detail, Risk } from "./atoms";

export function StrategyDetails({ open, onOpenChange, info, metrics }: { open: boolean; onOpenChange: (o: boolean) => void; info: StrategyInfo; metrics: StrategyMetrics | null }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-[#f8faf5] p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-7 text-left">
          <SheetTitle className="text-3xl">{info.name}</SheetTitle>
          <SheetDescription>A curated Morpho Vault V2 on Robinhood Chain.</SheetDescription>
        </SheetHeader>
        <div className="space-y-8 p-7">
          <section>
            <h3 className="font-semibold">Live strategy data</h3>
            <div className="mt-4 divide-y rounded-2xl border bg-white px-4">
              <Detail l="Net APY" v={pct(metrics?.netApy)} />
              <Detail l="Average net APY (trailing, window set by Morpho)" v={pct(metrics?.avgNetApy)} />
              <Detail l="Total deposits" v={metrics ? cash(metrics.totalAssetsUsd, 0) : "—"} />
              <Detail l="Available liquidity" v={metrics ? cash(metrics.liquidityUsd, 0) : "—"} />
              <Detail l="Management fee" v={metrics ? `${(metrics.managementFee * 100).toFixed(2)}%` : "—"} />
              <Detail l="Performance fee" v={metrics ? `${(metrics.performanceFee * 100).toFixed(2)}%` : "—"} />
              <Detail l="StockYield fee" v="0% — StockYield does not charge a fee" />
              <Detail l="Network gas" v="Paid by you, in ETH, set by the network" />
            </div>
          </section>
          <section>
            <h3 className="font-semibold">What can change</h3>
            <div className="mt-4 space-y-3">
              <Risk i={<RefreshCw />} t="Variable APY" d="Borrow demand and utilization change over time; past yield does not guarantee future yield." />
              <Risk i={<LockKeyhole />} t="Smart contract risk" d="Funds interact with Morpho Vault V2 and the lending markets it allocates to. A bug in any of these contracts could result in loss of funds." />
              <Risk i={<Clock3 />} t="Liquidity and withdrawal risk" d="If most vault liquidity is deployed to borrowers, a withdrawal can be delayed until liquidity is available. Every withdrawal is simulated before you are asked to sign, and you are told if it would fail; the app does not show a guaranteed withdrawable amount." />
              <Risk i={<Landmark />} t="Curator and collateral risk" d="Steakhouse selects markets and allocation limits, but cannot eliminate the underlying risk of the markets it chooses. If a borrower's collateral is not liquidated in time to cover their debt, the resulting bad debt can reduce what lenders can withdraw." />
              <Risk i={<CircleDollarSign />} t="USDG depeg risk" d="USDG is intended to track $1 but its market price can deviate from that peg. This app converts your position using the live USDG/USD price when depositing and valuing your position." />
            </div>
          </section>
          <a href={`${info.explorer}/address/${info.vault}`} target="_blank" className="flex items-center justify-between rounded-2xl border bg-white p-4 text-sm">
            <span><small className="block text-[#718078]">Vault contract</small><code>{short(info.vault)}</code></span>
            <ExternalLink size={17} />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
