"use client";
import { formatUnits } from "viem";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cash, pct, short } from "@/lib/format";
import { Sk } from "./sk";
import { useStockYield } from "./provider";

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t py-3 first:border-t-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="eyebrow pt-0.5">{k}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const actionCls = "h-11 flex-1 border px-4 text-sm font-semibold transition-colors active:translate-y-px";

export function PositionCard() {
  const s = useStockYield();
  const { info, m, pos, wallet, mode } = s;
  const { address } = wallet;
  const p = pos.position;
  const price = m.metrics?.assetPriceUsd ?? null;
  const go = (v: "deposit" | "withdraw") => {
    s.setMode(v);
    s.setAmount("");
    document.getElementById("earn-module")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const box = "border bg-surface p-6 md:p-8";

  if (!address) {
    return (
      <div className={box}>
        <p className="text-lg font-medium">Connect your wallet to view your position.</p>
        <p className="mt-2 text-sm text-ink-2">StockYield reads your vault shares directly on-chain. Nothing is stored and no account is needed.</p>
        <button onClick={wallet.connect} className="mt-5 h-11 rounded-sm bg-signal px-5 text-sm font-semibold text-ink transition-[transform,background-color] hover:bg-signal/90 active:translate-y-px">Connect Wallet</button>
      </div>
    );
  }
  if (pos.error) {
    return (
      <div className={box} role="alert">
        <p className="text-lg font-medium">Unable to load your position.</p>
        <p className="mt-2 text-sm text-ink-2">Your balance is not shown as zero because it is unknown right now.</p>
        <button onClick={() => pos.load(address)} className="mt-5 inline-flex h-11 items-center gap-2 border px-5 text-sm font-semibold hover:bg-surface-2"><RefreshCw size={14} />Retry</button>
      </div>
    );
  }
  if (!p) {
    return (
      <div className={box} aria-busy="true" aria-label="Loading your position">
        <p className="eyebrow">Loading position…</p>
        <div className="mt-4 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton block h-6 w-full" />)}</div>
      </div>
    );
  }

  const empty = p.shares === 0n;
  return (
    <div className={box}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Position value</p>
          <p className="num mt-3 text-4xl font-medium tracking-tight md:text-5xl">{Number(formatUnits(p.assets, info.asset.decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-2xl text-ink-2">USDG</span></p>
          <p className="num mt-1 text-sm text-ink-2">{price !== null ? `≈ ${cash(Number(formatUnits(p.assets, info.asset.decimals)) * price)}` : "USD value unavailable"}</p>
        </div>
        <button onClick={() => pos.load(address)} aria-label="Refresh position" className="grid h-10 w-10 place-items-center border hover:bg-surface-2"><RefreshCw size={15} /></button>
      </div>

      {empty ? (
        <p className="mt-6 border bg-mint-soft px-4 py-3 text-sm">No position yet. Deposit USDG to get started.</p>
      ) : null}

      <dl className="mt-6 border-y">
        <Field k="Wallet"><a className="num inline-flex items-center gap-1 font-medium hover:underline" href={`${info.explorer}/address/${address}`} target="_blank" rel="noreferrer">{short(address)}<ExternalLink size={12} /></a></Field>
        <Field k="Vault"><a className="inline-flex items-center gap-1 font-medium hover:underline" href={`${info.explorer}/address/${info.vault}`} target="_blank" rel="noreferrer">{info.name} <span className="num text-ink-2">{short(info.vault)}</span><ExternalLink size={12} /></a></Field>
        <Field k="Vault shares"><span className="num">{Number(formatUnits(p.shares, info.shareDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></Field>
        <Field k="Current net APY (variable)"><span className="num">{m.metrics ? pct(m.metrics.netApy) : m.error ? "Unavailable" : <Sk className="w-14" />}</span></Field>
        <Field k="Last read"><span className="num">{pos.updatedAt ? new Date(pos.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span></Field>
      </dl>

      <div className="mt-6 flex gap-3">
        <button onClick={() => go("deposit")} className={`${actionCls} ${mode === "deposit" ? "bg-ink text-bg" : "hover:bg-surface-2"}`}>Deposit</button>
        <button onClick={() => go("withdraw")} disabled={empty} className={`${actionCls} ${mode === "withdraw" ? "bg-ink text-bg" : "hover:bg-surface-2"} disabled:opacity-40`}>Withdraw</button>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-2">
        The position counts every vault share held by this wallet, including shares bought or received outside StockYield. It is the current value of those shares, not the amount deposited: net deposits and earnings are not shown because they can&apos;t be reconstructed reliably without a full history of deposits, withdrawals and share transfers.
      </p>
    </div>
  );
}
