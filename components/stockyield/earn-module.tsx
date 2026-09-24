"use client";
import { formatUnits, type Address } from "viem";
import { ArrowDownToLine, ArrowUpRight, CircleDollarSign, Info, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRANSACTIONS_ENABLED } from "@/lib/flags";
import { cash, parseAmount, pct, sanitizeAmountInput } from "@/lib/format";
import type { Position, StrategyInfo, StrategyMetrics, TxAction } from "@/lib/yield-strategy";
import { Row } from "./atoms";
import { YieldCheck } from "./yield-check";

export type EarnModuleProps = {
  info: StrategyInfo;
  mode: TxAction;
  onModeChange: (m: TxAction) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  metrics: StrategyMetrics | null;
  dataError: boolean;
  dataStale: boolean;
  gatesOpen: boolean | null;
  position: Position | null;
  positionError: boolean;
  address: Address | null;
  hasProvider: boolean;
  wrongNetwork: boolean;
  busy: boolean;
  onConnect: () => Promise<void>;
  onSwitchNetwork: () => Promise<void>;
  onRun: (action: TxAction, amount: bigint, hasShares: boolean) => Promise<void>;
};

export function EarnModule(p: EarnModuleProps) {
  const { info, mode, amount, metrics, position, address, gatesOpen, busy } = p;
  const decimals = info.asset.decimals;
  const parsed = parseAmount(amount, decimals);

  // Withdraw ceiling uses the position's current value (shares converted to
  // assets), not maxWithdraw: verified against the deployed vault's own
  // source that maxWithdraw is a hardcoded `pure` function that always
  // returns 0 in this Vault V2, so it cannot be used as a real ceiling. The
  // actual on-chain constraint (real-time deallocatable liquidity) is instead
  // caught by simulateContract right before a signature is requested.
  const balance = mode === "deposit" ? position?.walletBalance ?? 0n : position?.assets ?? 0n;
  const enough = parsed > 0n && parsed <= balance;
  const hasShares = (position?.shares ?? 0n) > 0n;
  const hasGas = (position?.ethBalance ?? 0n) > 0n;
  const gatesConfirmedOpen = gatesOpen === true;
  const depositBlockedByStaleData = mode === "deposit" && p.dataStale;
  const withdrawAmountUsd = Number(amount || 0) * (metrics?.assetPriceUsd ?? 1);
  const liquidityHeadsUp = mode === "withdraw" && !!metrics && withdrawAmountUsd > metrics.liquidityUsd;
  const switchable = !!address && p.hasProvider && p.wrongNetwork;

  const transact = async () => {
    if (!TRANSACTIONS_ENABLED) {
      toast.error("Transactions are not enabled yet");
      return;
    }
    if (!address || !p.hasProvider) {
      await p.onConnect();
      return;
    }
    if (!enough || (mode === "deposit" && !metrics)) return;
    if (depositBlockedByStaleData) {
      toast.error("Vault data is stale", { description: "Refresh before depositing so you're not acting on outdated numbers." });
      return;
    }
    if (gatesOpen === false) {
      toast.error("A gate is currently active on this vault", { description: "Deposits or withdrawals may require allowlisting. Do not proceed until this is confirmed with Steakhouse/Morpho." });
      return;
    }
    await p.onRun(mode, parsed, hasShares);
  };

  return (
    <aside className="self-start rounded-[30px] bg-[#173f2c] p-2 text-white shadow-[0_22px_55px_rgba(23,63,44,.22)] lg:sticky lg:top-6">
      <Tabs value={mode} onValueChange={(v) => { p.onModeChange(v as TxAction); p.onAmountChange(""); }}>
        <TabsList className="grid h-13 w-full grid-cols-2 rounded-[22px] bg-[#0f3021] p-1.5">
          <TabsTrigger value="deposit" className="rounded-[17px] text-white/65 data-[state=active]:bg-white data-[state=active]:text-[#173f2c]">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw" className="rounded-[17px] text-white/65 data-[state=active]:bg-white data-[state=active]:text-[#173f2c]">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="m-0 p-5 pt-7 md:p-7">
          <div className="flex justify-between text-sm text-white/65">
            <span>{mode === "deposit" ? "Wallet balance" : "Available to withdraw"}</span>
            <span>{position ? `${Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG` : p.positionError ? "Unavailable" : address ? "Loading…" : "Connect wallet"}</span>
          </div>
          <div className="mt-4 rounded-[22px] border border-white/12 bg-white/[.06] p-5">
            <div className="flex items-center gap-3">
              <input aria-label="Amount" inputMode="decimal" value={amount} onChange={(e) => p.onAmountChange(sanitizeAmountInput(e.target.value, decimals))} placeholder="0.00" className="min-w-0 flex-1 bg-transparent text-4xl outline-none placeholder:text-white/25" />
              <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-[#173f2c]"><CircleDollarSign size={17} />USDG</span>
            </div>
            <div className="mt-5 flex justify-between">
              <span className="text-sm text-white/45">≈ {cash(Number(amount || 0) * (metrics?.assetPriceUsd ?? 1))}</span>
              <button disabled={!position} onClick={() => p.onAmountChange(formatUnits(balance, decimals))} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">MAX</button>
            </div>
          </div>
          {liquidityHeadsUp && (
            <p className="mt-3 flex items-start gap-2 text-xs text-[#f3d17a]"><Info size={14} className="mt-0.5 shrink-0" />This is more than the vault&apos;s last reported available liquidity ({cash(metrics?.liquidityUsd ?? 0, 0)}). It may still work if liquidity has since changed, or it may need to be split into smaller withdrawals.</p>
          )}
          <div className="my-6 space-y-3 text-sm">
            <Row l="Current APY" v={pct(metrics?.netApy)} />
            {mode === "deposit" && <Row l="Estimated annual yield" v={cash(Number(amount || 0) * (metrics?.netApy ?? 0))} />}
            <Row l="Destination" v="Steakhouse · Morpho" />
            <Row l="Network fee" v="Paid in ETH, shown in your wallet before you sign" />
          </div>
          <YieldCheck connected={!!address} data={mode === "withdraw" || (!!metrics && !p.dataError && !p.dataStale)} gas={hasGas} amount={!amount || enough} gatesOpen={gatesOpen} network={!p.wrongNetwork} />
          <Button
            disabled={switchable ? busy : !TRANSACTIONS_ENABLED || busy || gatesOpen === false || (mode === "deposit" && !metrics) || (!!address && (!enough || !hasGas || depositBlockedByStaleData))}
            onClick={switchable ? p.onSwitchNetwork : transact}
            className="mt-5 h-14 w-full rounded-[18px] bg-[#b7f24a] text-base font-semibold text-[#173f2c] hover:bg-[#c4fa5d] disabled:bg-white/20 disabled:text-white/45"
          >
            {busy ? <LoaderCircle className="mr-2 animate-spin" /> : mode === "deposit" ? <ArrowDownToLine className="mr-2" size={19} /> : <ArrowUpRight className="mr-2" size={19} />}
            {switchable ? "Switch to Robinhood Chain" : !TRANSACTIONS_ENABLED ? "Transactions pending validation" : gatesOpen === false ? "Vault gate active — paused" : !address ? "Connect wallet" : mode === "deposit" ? "Earn with USDG" : "Withdraw USDG"}
          </Button>
          <p className="mt-4 text-center text-xs text-white/45">StockYield never receives or controls your funds.{gatesConfirmedOpen && " Verified open to any wallet — no allowlist."}</p>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
