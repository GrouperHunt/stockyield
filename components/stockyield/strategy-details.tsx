"use client";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cash, pct, short } from "@/lib/format";
import { useStockYield } from "./provider";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t py-3 first:border-t-0 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="eyebrow pt-0.5">{k}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
const ext = "inline-flex items-center gap-1 font-medium text-signal-ink underline-offset-4 hover:underline";
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Unavailable");

export function StrategyDetailsContent() {
  const { info, m, pos } = useStockYield();
  const x = m.metrics;
  const Unavailable = <span className="text-ink-2">Unavailable</span>;
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-2 text-base font-semibold">Strategy</h3>
        <dl className="border-y">
          <Row k="Vault">{info.name}</Row>
          <Row k="Protocol">{info.protocol}</Row>
          <Row k="Network">{info.network} · chain ID <span className="num">{info.chainId}</span></Row>
          <Row k="Asset">{info.asset.symbol} · <span className="num">{info.asset.decimals}</span> decimals · shares <span className="num">{info.shareDecimals}</span> decimals</Row>
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold">Contracts</h3>
        <dl className="border-y">
          <Row k="Vault"><a className={ext} href={`${info.explorer}/address/${info.vault}`} target="_blank" rel="noreferrer"><code className="num break-all">{info.vault}</code><ExternalLink size={13} /></a></Row>
          <Row k="USDG"><a className={ext} href={`${info.explorer}/address/${info.asset.address}`} target="_blank" rel="noreferrer"><code className="num break-all">{info.asset.address}</code><ExternalLink size={13} /></a></Row>
          <Row k="Explorer"><a className={ext} href={info.explorer} target="_blank" rel="noreferrer">Robinhood Chain explorer<ExternalLink size={13} /></a></Row>
          <Row k="Documentation"><a className={ext} href={info.docsUrl} target="_blank" rel="noreferrer">{info.vaultDocsNote}<ExternalLink size={13} /></a></Row>
          <Row k="Strategy page"><a className={ext} href={info.strategyUrl} target="_blank" rel="noreferrer">Vault on Morpho<ExternalLink size={13} /></a></Row>
        </dl>
        <p className="mt-2 text-xs text-ink-2">Addresses come from StockYield&apos;s configuration; the vault asset and its decimals are checked on-chain each time the page loads.</p>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold">Live metrics</h3>
        <dl className="border-y">
          <Row k="Net APY (variable)"><span className="num">{x ? pct(x.netApy) : Unavailable}</span><span className="block text-xs text-ink-2">Current rate after vault fees, including rewards (Morpho API definition).</span></Row>
          <Row k="Average net APY"><span className="num">{x ? pct(x.avgNetApy) : Unavailable}</span><span className="block text-xs text-ink-2">Realized average after fees, including rewards, over Morpho&apos;s default lookback (6 hours, per its API documentation).</span></Row>
          <Row k="Vault TVL"><span className="num">{x ? cash(x.totalAssetsUsd, 0) : Unavailable}</span><span className="block text-xs text-ink-2">Total assets in this vault. Not the amount deposited through StockYield.</span></Row>
          <Row k="Liquidity reported by API"><span className="num">{x ? cash(x.liquidityUsd, 0) : Unavailable}</span><span className="block text-xs text-ink-2">Idle assets plus liquidity in the vault&apos;s liquidity adapter, as reported by Morpho. It is not a promise of what you can withdraw: that is checked by simulation.</span></Row>
          <Row k="Vault fees"><span className="num">{x ? `management ${(x.managementFee * 100).toFixed(2)}% · performance ${(x.performanceFee * 100).toFixed(2)}%` : Unavailable}</span></Row>
          <Row k="StockYield fee">0% — StockYield does not charge a fee.</Row>
          <Row k="Network fee">Paid by you in ETH; estimated in Yield Check, final amount shown by your wallet.</Row>
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold">Sources and timestamps</h3>
        <dl className="border-y">
          <Row k="Metrics source">Morpho API (api.morpho.org/graphql), normalized and validated by StockYield&apos;s /api/strategy route.</Row>
          <Row k="Metrics fetched"><span className="num">{time(m.fetchedAt)}</span><span className="block text-xs text-ink-2">The time StockYield fetched them, not the time Morpho last indexed them.</span></Row>
          <Row k="Position and balances">Read directly on-chain from Robinhood Chain (public RPC). Last read: <span className="num">{time(pos.updatedAt)}</span></Row>
          <Row k="Vault address (short)"><code className="num">{short(info.vault)}</code></Row>
        </dl>
      </section>
    </div>
  );
}

export function StrategyDetailsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { info } = useStockYield();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-bg p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-6 text-left">
          <p className="eyebrow">Strategy details</p>
          <SheetTitle className="text-3xl font-medium tracking-tight">{info.name}</SheetTitle>
          <SheetDescription>A curated Morpho Vault V2 on {info.network}.</SheetDescription>
        </SheetHeader>
        <div className="p-6"><StrategyDetailsContent /></div>
      </SheetContent>
    </Sheet>
  );
}
