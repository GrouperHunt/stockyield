"use client";
import { useRef, useState } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { toast } from "sonner";
import { chain } from "@/lib/strategies/steakhouse-usdg/config";
import { describeTxError, isReceiptTimeout, isUserRejection } from "@/lib/tx-errors";
import type { SimState, TxAction, TxStep, YieldStrategy } from "@/lib/yield-strategy";

type Ctx = {
  provider: EIP1193Provider | null;
  address: Address | null;
  ensureChain: (p: EIP1193Provider) => Promise<void>;
};

export function useTransaction(strategy: YieldStrategy, { provider, address, ensureChain }: Ctx) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<TxStep>("approval");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<SimState>({ status: "idle" });
  const [action, setAction] = useState<TxAction>("deposit");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [failedAt, setFailedAt] = useState<TxStep | null>(null);
  const runRef = useRef(0);
  const stepRef = useRef<TxStep>("approval");
  const hashRef = useRef<string | null>(null);
  const put = (s: TxStep) => {
    stepRef.current = s;
    setStep(s);
  };

  // Called when the account/network changes: the previous operation must not
  // touch the UI or refresh anything for the old account when it settles.
  const invalidate = () => {
    runRef.current++;
    setOpen(false);
    setBusy(false);
  };

  const run = async (act: TxAction, amount: bigint, hasShares: boolean, onDone: () => Promise<void> | void) => {
    if (!provider || !address) return;
    const id = ++runRef.current;
    const live = () => runRef.current === id;
    setBusy(true);
    setOpen(true);
    hashRef.current = null;
    setHash(null);
    setError(null);
    setSim({ status: "idle" });
    setAction(act);
    setApprovalNeeded(false);
    setFailedAt(null);
    put(act === "deposit" ? "approval" : "withdraw");
    try {
      // Re-read the live account/chain right before signing: UI state may be stale.
      const liveAccounts = (await provider.request({ method: "eth_accounts" })) as string[];
      if (!liveAccounts[0] || liveAccounts[0].toLowerCase() !== address.toLowerCase()) {
        throw new Error("The connected wallet account changed. Reconnect and try again.");
      }
      await ensureChain(provider);
      const wallet = createWalletClient({ account: address, chain, transport: custom(provider) });
      await strategy.execute(act, {
        owner: address,
        amount,
        wallet,
        hasShares,
        onStep: (s) => {
          if (!live()) return;
          if (s === "approval") setApprovalNeeded(true);
          put(s);
        },
        onHash: (h) => {
          hashRef.current = h;
          if (live()) setHash(h);
        },
        isLive: live,
        onSim: (s) => live() && setSim(s),
      });
      if (!live()) return;
      put("done");
      await onDone();
    } catch (e) {
      if (!live()) return;
      setFailedAt(stepRef.current);
      // Once a hash exists the transaction was sent. Any error that is not an explicit
      // on-chain revert (RPC hiccup while polling, timeout) means "unknown", never "failed":
      // it may still confirm, so the user must not be invited to resend.
      const message = e instanceof Error ? e.message : "";
      if (isReceiptTimeout(e) || (hashRef.current && !isUserRejection(e) && !/reverted on-chain/i.test(message))) {
        put("pending");
        toast.info("Sent, but not confirmed yet", { description: "Check the transaction on the explorer before trying again. Do not resend." });
        return;
      }
      setError(describeTxError(e));
      if (isUserRejection(e)) {
        put("rejected");
      } else {
        put("failed");
        toast.error("Transaction not completed", { description: describeTxError(e) });
      }
    } finally {
      if (live()) setBusy(false);
    }
  };

  return { open, setOpen, busy, step, hash, error, sim, action, approvalNeeded, failedAt, run, invalidate };
}
