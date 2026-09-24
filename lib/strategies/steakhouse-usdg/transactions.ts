import { BaseError, ContractFunctionRevertedError, type Address } from "viem";
import { describeTxError } from "@/lib/tx-errors";
import type { ExecuteParams, SimResult, TxAction } from "@/lib/yield-strategy";
import { erc20Abi, publicClient as client, USDG, VAULT, vaultAbi } from "./config";

async function feeFor(call: () => Promise<bigint>): Promise<bigint | null> {
  try {
    const [gas, price] = await Promise.all([call(), client.getGasPrice()]);
    return gas * price;
  } catch {
    return null;
  }
}

// Simulates the NEXT transaction the user would sign (approve if the allowance is
// short, otherwise the deposit/withdraw itself). A contract revert is "failed";
// anything else (RPC down, timeout) is "unavailable" — never a silent pass.
export async function simulate(action: TxAction, { owner, amount }: { owner: Address; amount: bigint }): Promise<SimResult> {
  try {
    if (action === "deposit") {
      const allowance = await client.readContract({ address: USDG, abi: erc20Abi, functionName: "allowance", args: [owner, VAULT] });
      if (allowance < amount) {
        await client.simulateContract({ account: owner, address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, amount] });
        const feeWei = await feeFor(() => client.estimateContractGas({ account: owner, address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, amount] }));
        return { status: "passed", step: "approval", feeWei };
      }
      await client.simulateContract({ account: owner, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [amount, owner] });
      const feeWei = await feeFor(() => client.estimateContractGas({ account: owner, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [amount, owner] }));
      return { status: "passed", step: "deposit", feeWei };
    }
    await client.simulateContract({ account: owner, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [amount, owner, owner] });
    const feeWei = await feeFor(() => client.estimateContractGas({ account: owner, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [amount, owner, owner] }));
    return { status: "passed", step: "withdraw", feeWei };
  } catch (e) {
    const reverted = e instanceof BaseError && !!e.walk((x) => x instanceof ContractFunctionRevertedError);
    return { status: reverted ? "failed" : "unavailable", reason: reverted ? describeTxError(e) : "Could not reach the network to run the simulation." };
  }
}

// Every step is simulated before the wallet is asked to sign, and success is
// only reported when the receipt status is "success" (a hash is not a deposit).
export async function execute(action: TxAction, { owner, amount, wallet, hasShares, onStep, onHash, onSim, isLive = () => true }: ExecuteParams): Promise<void> {
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
    if (!isLive()) return;

    onStep("deposit");
    onHash(null);
    // Re-simulate the deposit now that the allowance is in place, and show it. A node that
    // is a block behind can still report the old allowance, so a revert is retried briefly.
    onSim?.({ status: "checking" });
    for (let attempt = 1; ; attempt++) {
      try {
        await client.simulateContract({ account: owner, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [amount, owner] });
        break;
      } catch (e) {
        if (attempt < 3 && isLive()) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        onSim?.({ status: "failed", reason: describeTxError(e) });
        throw e;
      }
    }
    if (!isLive()) return;
    onSim?.({ status: "passed", step: "deposit", feeWei: null });
    if (!isLive()) return;
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
