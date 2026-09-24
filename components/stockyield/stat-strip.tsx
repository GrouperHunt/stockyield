"use client";
import { RefreshCw } from "lucide-react";
import { compact, feePct, pct } from "@/lib/format";
import { useStockYield } from "./provider";
import { Sk } from "./sk";

function Cell({ i, label, note, children }: { i: string; label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="p-5 md:p-6">
      <div className="flex items-baseline justify-between"><p className="eyebrow">{label}</p><span className="font-mono text-[11px] text-ink-2">{i}</span></div>
      <p className="num mt-3 text-3xl font-medium tracking-tight md:text-4xl">{children}</p>
      {note && <p className="mt-1 text-xs text-ink-2">{note}</p>}
    </div>
  );
}

export function StatStrip() {
  const { m } = useStockYield();
  const x = m.metrics;
  const loading = !x && !m.error;
  const V = (v: string) => (loading ? <Sk className="w-28" /> : x ? v : <span className="text-ink-2">Unavailable</span>);
  return (
    <section aria-label="Vault metrics" className="border-y bg-surface">
      <div className="mx-auto max-w-[1200px] md:px-8">
        <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0 md:border-x">
          <Cell i="01" label="Net APY" note="Variable · after vault fees">{V(x ? pct(x.netApy) : "")}</Cell>
          <Cell i="02" label="Vault TVL" note="Total assets in this vault, in USDG">{x ? <>{compact(x.totalAssets)}<span className="ml-1.5 text-base text-ink-2">USDG</span></> : V("")}</Cell>
          <Cell i="03" label="Liquidity" note="Reported by API, in USDG">{x ? <>{compact(x.liquidity)}<span className="ml-1.5 text-base text-ink-2">USDG</span></> : V("")}</Cell>
          <Cell i="04" label="Vault fees" note="Management · performance">{V(x ? `${feePct(x.managementFee)} · ${feePct(x.performanceFee)}` : "")}</Cell>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-ink-2 md:border-x md:px-6">
          <span>
            Source: Morpho API · {m.fetchedAt ? <>fetched <span className="num">{new Date(m.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> (StockYield fetch time)</> : "not fetched yet"}
            {m.stale && <strong className="ml-2 text-warn">Data may be outdated</strong>}
          </span>
          <button onClick={m.refresh} className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"><RefreshCw size={12} />{m.error ? "Retry" : "Refresh"}</button>
        </div>
        {m.error && <p role="alert" className="border-x border-t bg-surface-2 px-6 py-2 text-sm">Live vault data is unavailable right now. Numbers are not shown rather than guessed.</p>}
      </div>
    </section>
  );
}
