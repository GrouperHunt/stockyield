"use client";
import { Check, Clock3, ExternalLink, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SimState, TxAction, TxStep } from "@/lib/yield-strategy";
import { StateMark } from "./state-mark";

type RowStatus = "waiting" | "submitted" | "confirmed" | "failed" | "rejected" | "pending" | "notstarted";
const WORD: Record<RowStatus, string> = { waiting: "Waiting for wallet", submitted: "Submitted", confirmed: "Confirmed", failed: "Failed", rejected: "Rejected by user", pending: "Still pending", notstarted: "Not started" };

function Icon({ s }: { s: RowStatus }) {
  const base = "grid h-8 w-8 shrink-0 place-items-center border";
  if (s === "confirmed") return <span className={`${base} border-signal-ink bg-signal-ink text-white`}><Check size={16} strokeWidth={3} /></span>;
  if (s === "failed") return <span className={`${base} nudge border-danger bg-danger text-white`}><X size={16} strokeWidth={3} /></span>;
  if (s === "rejected") return <span className={`${base} border-ink-2 text-ink-2`}><Minus size={16} /></span>;
  if (s === "pending") return <span className={`${base} border-warn text-warn`}><Clock3 size={16} /></span>;
  if (s === "submitted") return <span className={`${base} relative border-ink`}><span className="indeterminate absolute inset-x-0 bottom-0 h-0.5" /></span>;
  if (s === "waiting") return <span className={`${base} pulse-ring border-ink`} />;
  return <span className={`${base} border-dashed border-ink-2`} />;
}

export function TxDialog({ open, step, action, approvalNeeded, failedAt, hash, error, sim, explorer, onOpenChange, onClose }: {
  open: boolean; step: TxStep; action: TxAction; approvalNeeded: boolean; failedAt: TxStep | null; hash: string | null; error: string | null; sim: SimState; explorer: string;
  onOpenChange: (o: boolean) => void; onClose: () => void;
}) {
  const terminal = step === "done" || step === "failed" || step === "rejected" || step === "pending";
  const active = terminal ? failedAt : step; // which step the terminal state belongs to
  const rowFor = (which: "approval" | "deposit" | "withdraw"): RowStatus => {
    const order = ["approval", "deposit", "withdraw"];
    if (step === "done") return "confirmed";
    if (terminal && active) {
      if (which === active) return step === "failed" ? "failed" : step === "rejected" ? "rejected" : "pending";
      return order.indexOf(which) < order.indexOf(active) ? "confirmed" : "notstarted";
    }
    if (which === step) return hash ? "submitted" : "waiting";
    return order.indexOf(which) < order.indexOf(step) ? "confirmed" : "notstarted";
  };
  const rows: { key: "approval" | "deposit" | "withdraw"; label: string }[] =
    action === "withdraw" ? [{ key: "withdraw", label: "Withdraw USDG to your wallet" }]
    : [...(approvalNeeded ? [{ key: "approval" as const, label: "Approve USDG (limited to this amount)" }] : []), { key: "deposit", label: "Deposit USDG into the vault" }];

  const title = step === "done" ? "Confirmed" : step === "failed" ? "Failed" : step === "rejected" ? "Rejected by user" : step === "pending" ? "Still pending" : hash ? "Submitted" : "Waiting for wallet";
  const desc =
    step === "done" ? "Your transaction succeeded on-chain and your position has been refreshed."
    : step === "failed" ? error ?? "The transaction did not complete."
    : step === "rejected" ? "You rejected the request in your wallet. Nothing was sent for this step."
    : step === "pending" ? "Your transaction was sent but is not confirmed yet. It may still succeed. Check its status on the explorer before trying again — do not resend."
    : hash ? "Sent to the network. Waiting for confirmation." : "Confirm the request in your wallet. Nothing moves until you sign.";

  const showSim = action === "deposit" && approvalNeeded && sim.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md bg-surface sm:max-w-md">
        <DialogHeader>
          <p className="eyebrow">{action === "deposit" ? "Deposit" : "Withdraw"}</p>
          <DialogTitle className="text-2xl font-medium tracking-tight" aria-live="polite">{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {rows.map((r, i) => {
            const st = rowFor(r.key);
            return (
              <li key={r.key} className="flex items-center gap-3">
                <Icon s={st} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{rows.length > 1 ? `Step ${i + 1} of ${rows.length} · ` : ""}{r.label}</p>
                  <p className="text-xs text-ink-2">{WORD[st]}</p>
                </div>
              </li>
            );
          })}
        </ol>
        {showSim && (
          <div className="border bg-mint-soft px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span>Deposit simulation (after approval)</span>
              <StateMark state={sim.status === "checking" ? "checking" : sim.status === "idle" ? "unavailable" : sim.status} />
            </div>
            {sim.status === "failed" && <p className="mt-1 text-xs text-danger">{sim.reason}</p>}
          </div>
        )}
        {hash && <a href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-signal-ink underline-offset-4 hover:underline">View transaction on the explorer <ExternalLink size={14} /></a>}
        {terminal && (
          <Button onClick={onClose} className="h-11 w-full rounded-sm bg-ink text-bg hover:bg-ink/90">
            {step === "done" ? "Done" : step === "pending" ? "Close and refresh position" : "Close"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
