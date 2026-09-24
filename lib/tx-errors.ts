// viem throws these when the receipt is not found within its wait window. The
// transaction was already sent and may still confirm, so it is not a failure.
export function isReceiptTimeout(e: unknown): boolean {
  const name = (e as { name?: string } | undefined)?.name ?? "";
  return name === "WaitForTransactionReceiptTimeoutError" || name === "TransactionReceiptNotFoundError";
}

// Patterns below are not guesses: they were produced by simulating real
// reverts from the deployed vault (via simulateContract on a forked copy of
// its actual state) — an underflow panic on an over-withdraw, and the vault's
// own TransferFromReverted custom error (selector 0xe65b7a77) on insufficient
// allowance. See VALIDATION.md for the reproduction.
export function describeTxError(e: unknown): string {
  const code = (e as { code?: number; cause?: { code?: number } } | undefined)?.code ?? (e as { cause?: { code?: number } } | undefined)?.cause?.code;
  if (code === 4001) return "You rejected the request in your wallet.";
  const message = e instanceof Error ? e.message : "";
  if (/reverted on-chain/i.test(message)) return message;
  if (/insufficient funds/i.test(message)) return "Your wallet does not have enough ETH to pay gas.";
  if (/no shares to withdraw|stale|gate is currently active/i.test(message)) return message;
  if (/User rejected|denied transaction/i.test(message)) return "You rejected the request in your wallet.";
  if (/underflow or overflow/i.test(message)) return "This amount is more than your current position or the vault can process right now.";
  if (/0xe65b7a77|TransferFromReverted/i.test(message)) return "The USDG transfer failed — check your balance and allowance for this amount.";
  return message ? message.slice(0, 160) : "The request could not be completed.";
}
