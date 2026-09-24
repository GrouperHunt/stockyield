"use client";
import { formatEther } from "viem";
import { cash } from "@/lib/format";
import { useStockYield } from "./provider";
import { StateMark, type CheckState } from "./state-mark";

function Item({ label, state, note }: { label: string; state: CheckState; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-ink">{label}{note && <span className="block text-xs text-ink-2">{note}</span>}</span>
      <StateMark state={state} />
    </div>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <li className="border-t py-3 first:border-t-0">
      <p className="eyebrow">{q}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </li>
  );
}

const eth = (wei: bigint) => {
  const v = Number(formatEther(wei));
  return v === 0 ? "0 ETH" : `≈ ${v < 0.000001 ? "<0.000001" : v.toPrecision(2)} ETH`;
};

export function YieldCheck() {
  const { info, m, wallet, sim, mode, hasGas, pos } = useStockYield();
  const { address, wrongNetwork } = wallet;
  const metrics = m.metrics;

  const network: CheckState = !address ? "unavailable" : wrongNetwork ? "failed" : "passed";
  const gas: CheckState = !address || !pos.position ? "unavailable" : hasGas ? "passed" : "failed";
  const config: CheckState = m.configOk === null ? "unavailable" : m.configOk ? "passed" : "failed";
  const gates: CheckState = m.gatesOpen === null ? "unavailable" : m.gatesOpen ? "passed" : "failed";
  const data: CheckState = m.error ? "unavailable" : !metrics ? "checking" : m.stale ? "failed" : "passed";
  const simState: CheckState = sim.status === "idle" ? "unavailable" : sim.status;
  const fee: CheckState = sim.status === "checking" ? "checking" : sim.status === "passed" && sim.feeWei !== null ? "passed" : "unavailable";
  const feeNote =
    sim.status === "passed" && sim.feeWei !== null
      ? `${eth(sim.feeWei)} for ${sim.step === "approval" ? "step 1 (approve); the deposit is estimated after approval" : sim.step === "deposit" ? "the deposit" : "the withdrawal"}`
      : sim.status === "idle" ? "Shown once your wallet is connected and an amount is entered" : undefined;
  const dataRequired = mode === "deposit";
  const ready = network === "passed" && gas === "passed" && gates !== "failed" && config !== "failed" && simState === "passed" && (!dataRequired || data === "passed");

  return (
    <section aria-labelledby="yc-title" className="border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b bg-mint-soft px-4 py-3">
        <h3 id="yc-title" className="text-sm font-semibold">Yield Check</h3>
        <span key={String(ready)} className="sweep border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider">{ready ? "Ready to sign" : "Not ready"}</span>
      </div>
      <ul className="px-4">
        <Q q="Where do the funds go?">
          <p className="text-sm text-ink-2">Directly from your wallet to the {info.name} vault on {info.protocol}, on {info.network}. StockYield never receives them.</p>
          <Item label={`Vault asset is ${info.asset.symbol} (${info.asset.decimals} decimals)`} state={config} note={config === "failed" ? "On-chain configuration does not match — do not proceed" : config === "unavailable" ? "Could not be read yet" : "Read on-chain"} />
          <Item label={`Wallet is on ${info.network}`} state={network} note={!address ? "Connect a wallet to check" : wrongNetwork ? "Switch network to continue" : undefined} />
        </Q>
        <Q q="Where does the yield come from?">
          <p className="text-sm text-ink-2">Interest paid by borrowers in the underlying {info.protocol} lending markets. Variable, not guaranteed.</p>
        </Q>
        <Q q="What will it cost?">
          <Item label="Network fee (estimate)" state={fee} note={feeNote} />
          <Item label="ETH for gas in your wallet" state={gas} />
          <p className="text-sm text-ink-2">
            Vault fees: {metrics ? <span className="num">management {(metrics.managementFee * 100).toFixed(2)}% · performance {(metrics.performanceFee * 100).toFixed(2)}%</span> : "Unavailable"} · StockYield fee: 0%
          </p>
        </Q>
        <Q q="What can limit withdrawal?">
          <p className="text-sm text-ink-2">
            Withdrawals draw on idle assets and lending-market liquidity. Reported liquidity (Morpho API): <span className="num">{metrics ? cash(metrics.liquidityUsd, 0) : "Unavailable"}</span>. What can actually be withdrawn is checked by the simulation.
          </p>
          <Item label="No allowlist gate on the vault" state={gates} />
        </Q>
        <Q q="Are data and simulation current?">
          <Item label="Vault data" state={data} note={data === "failed" ? "Older than 3 minutes — refresh before depositing" : data === "passed" && m.fetchedAt ? `Fetched ${new Date(m.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : undefined} />
          <Item label="Transaction simulation" state={simState} note={sim.status === "failed" || sim.status === "unavailable" ? sim.reason : sim.status === "idle" ? "Runs once your wallet is connected and the amount is valid" : sim.status === "passed" ? "The next transaction would succeed right now" : undefined} />
        </Q>
      </ul>
      <p className="border-t bg-surface-2 px-4 py-2 text-xs text-ink-2">A passed simulation is not a security assessment of the protocol.</p>
      <p className="sr-only" role="status" aria-live="polite">Transaction simulation: {simState}{sim.status === "failed" ? `. ${sim.reason}` : ""}</p>
    </section>
  );
}
