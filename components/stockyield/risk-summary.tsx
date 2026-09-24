import Link from "next/link";
import { DISCLAIMER, RISKS } from "@/lib/content";

const SHOWN = ["smart-contract", "liquidity", "stablecoin", "variable-apy"];

export function RiskSummary() {
  return (
    <aside aria-labelledby="risk-summary" className="border bg-surface p-5">
      <h3 id="risk-summary" className="text-sm font-semibold">Before you deposit</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {RISKS.filter((r) => SHOWN.includes(r.id)).map((r) => (
          <li key={r.id} className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-ink" /><span><strong className="font-medium">{r.title}:</strong> <span className="text-ink-2">{r.short}</span></span></li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-2">{DISCLAIMER}</p>
      <Link href="/risks" className="mt-3 inline-block text-sm font-medium text-signal-ink underline-offset-4 hover:underline">All 8 risks and FAQ →</Link>
    </aside>
  );
}
