"use client";
import { useState } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { toast } from "sonner";
import { chain } from "@/lib/strategies/steakhouse-usdg/config";
import { describeTxError, isReceiptTimeout } from "@/lib/tx-errors";
import type { TxAction, TxStep, YieldStrategy } from "@/lib/yield-strategy";

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

  const run = async (action: TxAction, amount: bigint, hasShares: boolean, onDone: () => Promise<void> | void) => {
    if (!provider || !address) return;
    setBusy(true);
    setOpen(true);
    setHash(null);
    setStep(action === "deposit" ? "approval" : "withdraw");
    try {
      // Re-read the live account/chain right before signing: UI state may be stale.
      const liveAccounts = (await provider.request({ method: "eth_accounts" })) as string[];
      if (!liveAccounts[0] || liveAccounts[0].toLowerCase() !== address.toLowerCase()) {
        throw new Error("The connected wallet account changed. Reconnect and try again.");
      }
      await ensureChain(provider);
      const wallet = createWalletClient({ account: address, chain, transport: custom(provider) });
      await strategy.execute(action, { owner: address, amount, wallet, hasShares, onStep: setStep, onHash: setHash });
      setStep("done");
      await onDone();
    } catch (e) {
      if (isReceiptTimeout(e)) {
        setStep("pending");
        return;
      }
      setOpen(false);
      toast.error("Transaction not completed", { description: describeTxError(e) });
    } finally {
      setBusy(false);
    }
  };

  return { open, setOpen, busy, step, hash, run };
}
