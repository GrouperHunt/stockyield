"use client";
import { formatUnits } from "viem";
import { ArrowDownToLine, ArrowUpRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TRANSACTIONS_ENABLED } from "@/lib/flags";
import { cash, pct, sanitizeAmountInput, short } from "@/lib/format";
import { useStockYield } from "./provider";
import { YieldCheck } from "./yield-check";

function Dl({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k}><dt className="eyebrow">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>
      ))}
    </dl>
  );
}

const fmt = (v: bigint, decimals: number) => Number(formatUnits(v, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function EarnModule() {
  const s = useStockYield();
  const { info, m, pos, wallet, tx, sim, mode, amount, decimals, parsed, balance, enough, hasShares, hasGas, limitedByLiquidity } = s;
  const { address, wrongNetwork } = wallet;
  const metrics = m.metrics;
  const position = pos.position;
  const price = metrics?.assetPriceUsd ?? null;
  const busy = tx.busy || wallet.switching;
  const switchable = !!address && !!wallet.provider && wrongNetwork;
  const overBalance = parsed > 0n && parsed > balance;
  const errId = "amount-error";

  const transact = async () => {
    if (!TRANSACTIONS_ENABLED) {
      toast.error("Transactions are not enabled yet");
      return;
    }
    if (!address || !wallet.provider) {
      await wallet.connect();
      return;
    }
    if (!enough || (mode === "deposit" && (!metrics || m.stale))) return;
    if (m.configOk === false) return;
    if (m.gatesOpen === false) {
      toast.error("A gate is currently active on this vault", { description: "Deposits or withdrawals may require allowlisting. Do not proceed until this is confirmed with Steakhouse/Morpho." });
      return;
    }
    await s.run(mode, parsed, hasShares);
  };

  // One label that always states why the button is (in)active.
  const cta = (() => {
    if (switchable) return { label: "Switch to Robinhood Chain", disabled: busy, onClick: wallet.switchNetwork };
    const base = { onClick: transact };
    if (!TRANSACTIONS_ENABLED) return { ...base, label: "Transactions pending validation", disabled: true };
    if (m.gatesOpen === false) return { ...base, label: "Vault gate active — paused", disabled: true };
    if (m.configOk === false) return { ...base, label: "Vault configuration mismatch", disabled: true };
    if (!address) return { ...base, label: "Connect Wallet", disabled: busy };
    if (!position) return { ...base, label: pos.error ? "Position unavailable — retry" : "Loading your balance…", disabled: true };
    if (parsed === 0n) return { ...base, label: "Enter an amount", disabled: true };
    if (!enough) return { ...base, label: mode === "deposit" ? "Amount exceeds your balance" : "Amount exceeds withdrawable", disabled: true };
    if (!hasGas) return { ...base, label: "ETH needed for gas", disabled: true };
    if (mode === "deposit" && !metrics) return { ...base, label: m.error ? "Vault data unavailable" : "Loading vault data…", disabled: true };
    if (mode === "deposit" && m.stale) return { ...base, label: "Data outdated — refresh", disabled: true };
    if (sim.status === "failed") return { ...base, label: "Simulation failed", disabled: true };
    return { ...base, label: mode === "deposit" ? "Earn with USDG" : "Withdraw USDG", disabled: busy || sim.status === "checking" };
  })();

  const signatures =
    mode === "withdraw" ? "1 signature: Withdraw USDG"
    : sim.status === "passed" && sim.step === "approval" ? "2 signatures: Step 1 Approve USDG (limited to this amount) → Step 2 Deposit USDG"
    : sim.status === "passed" && sim.step === "deposit" ? "1 signature: Deposit USDG (allowance already sufficient)"
    : "1–2 signatures: Approve USDG (only if needed, limited to this amount), then Deposit USDG";

  return (
    <div id="earn-module" className="border bg-surface shadow-[0_1px_0_rgba(23,26,23,.04),0_8px_24px_-12px_rgba(23,26,23,.12)]">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Earn with USDG</h2>
        <div role="group" aria-label="Action" className="inline-flex border bg-surface p-0.5">
          {(["deposit", "withdraw"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={mode === v}
              onClick={() => { s.setMode(v); s.setAmount(""); }}
              className={`h-8 px-3 text-sm capitalize transition-colors ${mode === v ? "bg-ink text-bg" : "hover:bg-surface-2"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <Dl rows={[["Vault", info.name], ["Protocol", info.protocol], ["Network", info.network], ["Asset", info.asset.symbol]]} />

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="amount" className="eyebrow">{mode === "deposit" ? "Amount to deposit" : "Amount to withdraw"}</label>
            <span className="num text-ink-2">
              {mode === "deposit" ? "Balance " : limitedByLiquidity ? "Withdrawable (liquidity-limited) " : "Position value "}
              {position ? <>{fmt(balance, decimals)} USDG</> : pos.error ? "Unavailable" : address ? <span className="skeleton">0.00 USDG</span> : "—"}
            </span>
          </div>
          <div className={`mt-2 flex items-center gap-3 border bg-surface px-4 py-3 transition-colors focus-within:border-ink ${overBalance ? "border-danger" : ""}`}>
            <input
              id="amount"
              aria-label="Amount"
              aria-invalid={overBalance}
              aria-describedby={overBalance ? errId : undefined}
              inputMode="decimal"
              autoComplete="off"
              value={s.amount}
              onChange={(e) => s.setAmount(sanitizeAmountInput(e.target.value, decimals))}
              placeholder="0.00"
              className="num min-w-0 flex-1 bg-transparent text-3xl font-medium tracking-tight outline-none placeholder:text-ink-2/40"
            />
            <span className="font-mono text-sm">USDG</span>
            <button type="button" disabled={!position} onClick={() => s.setAmount(formatUnits(balance, decimals))} className="border px-2 py-1 font-mono text-xs uppercase transition-colors hover:bg-surface-2 active:translate-y-px disabled:opacity-40">Max</button>
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink-2">
            <span className="num">{price !== null ? <>≈ {cash(Number(amount || 0) * price)}</> : "USD value unavailable"}</span>
            {mode === "withdraw" && limitedByLiquidity && <span>Limited by last reported liquidity</span>}
          </div>
          {overBalance && (
            <p id={errId} role="alert" className="mt-2 text-sm text-danger">
              {mode === "deposit" ? "Amount exceeds your USDG balance." : limitedByLiquidity ? "Amount exceeds what the last reported liquidity allows." : "Amount exceeds your position value."}
            </p>
          )}
        </div>

        <Dl
          rows={[
            ["Current net APY (variable)", <span key="a" className="num">{m.error && !metrics ? "Unavailable" : metrics ? pct(metrics.netApy) : <span className="skeleton">0.00%</span>}</span>],
            mode === "deposit"
              ? ["Estimated annual yield", <span key="y" className="num">{metrics ? cash(Number(amount || 0) * metrics.netApy) : "Unavailable"}</span>]
              : ["You receive (estimate)", <span key="r" className="num">{parsed > 0n ? `≈ ${fmt(parsed, decimals)} USDG` : "—"}</span>],
            ...(mode === "withdraw" ? ([["Recipient", address ? <span key="d" className="num">{short(address)} (your wallet)</span> : "—"]] as [string, React.ReactNode][]) : []),
          ]}
        />

        <YieldCheck />

        <p className="text-xs text-ink-2">{signatures}</p>

        <Button
          disabled={cta.disabled}
          onClick={cta.onClick}
          className="group h-14 w-full rounded-sm bg-signal text-base font-semibold text-ink transition-[transform,background-color] hover:bg-signal/90 active:translate-y-px disabled:bg-surface-2 disabled:text-ink-2 disabled:opacity-100"
        >
          {busy || (sim.status === "checking" && cta.label.startsWith("Earn")) ? <LoaderCircle className="animate-spin" /> : mode === "deposit" ? <ArrowDownToLine /> : <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
          {cta.label}
        </Button>
        <p className="text-center text-xs text-ink-2">StockYield never receives or controls your funds. You sign every transaction in your wallet.</p>
      </div>
    </div>
  );
}
