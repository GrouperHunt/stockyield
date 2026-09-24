import type { ExecuteParams, TxAction } from "@/lib/yield-strategy";
import { erc20Abi, publicClient as client, USDG, VAULT, vaultAbi } from "./config";

// Every step is simulated before the wallet is asked to sign, and success is
// only reported when the receipt status is "success" (a hash is not a deposit).
export async function execute(action: TxAction, { owner, amount, wallet, hasShares, onStep, onHash }: ExecuteParams): Promise<void> {
  if (action === "deposit") {
    const allowance = await client.readContract({ address: USDG, abi: erc20Abi, functionName: "allowance", args: [owner, VAULT] });
    if (allowance < amount) {
      onStep("approval");
      await client.simulateContract({ account: owner, address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, amount] });
      const approveHash = await wallet.writeContract({ account: owner, chain: wallet.chain, address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, amount] });
      onHash(approveHash);
      const approveReceipt = await client.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status !== "success") throw new Error("The approval transaction reverted on-chain.");
    }

    onStep("deposit");
    onHash(null);
    await client.simulateContract({ account: owner, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [amount, owner] });
    const depositHash = await wallet.writeContract({ account: owner, chain: wallet.chain, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [amount, owner] });
    onHash(depositHash);
    const depositReceipt = await client.waitForTransactionReceipt({ hash: depositHash });
    if (depositReceipt.status !== "success") throw new Error("The deposit transaction reverted on-chain.");
  } else {
    if (!hasShares) throw new Error("You have no shares to withdraw.");
    onStep("withdraw");
    await client.simulateContract({ account: owner, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [amount, owner, owner] });
    const withdrawHash = await wallet.writeContract({ account: owner, chain: wallet.chain, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [amount, owner, owner] });
    onHash(withdrawHash);
    const withdrawReceipt = await client.waitForTransactionReceipt({ hash: withdrawHash });
    if (withdrawReceipt.status !== "success") throw new Error("The withdrawal transaction reverted on-chain.");
  }
}
