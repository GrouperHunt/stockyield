import type { Address } from "viem";
import type { Position } from "@/lib/yield-strategy";
import { assetAbi, erc20Abi, gateAbi, publicClient as client, USDG, USDG_DECIMALS, VAULT, vaultAbi, ZERO_ADDRESS } from "./config";

export async function readPosition(owner: Address): Promise<Position> {
  const [walletBalance, shares, ethBalance] = await Promise.all([
    client.readContract({ address: USDG, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    client.readContract({ address: VAULT, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    client.getBalance({ address: owner }),
  ]);
  const assets = shares > 0n ? await client.readContract({ address: VAULT, abi: vaultAbi, functionName: "convertToAssets", args: [shares] }) : 0n;
  return { walletBalance, shares, ethBalance, assets };
}

// Live safety check, not a cap: confirms the vault's four gates are still
// disabled (0x0 = open to any wallet), verified against the deployed vault's
// actual source. If a gate is ever turned on this returns false and the app
// stops claiming permissionless access instead of silently failing.
export async function readAccessOpen(): Promise<boolean> {
  const [receiveShares, sendShares, receiveAssets, sendAssets] = await Promise.all([
    client.readContract({ address: VAULT, abi: gateAbi, functionName: "receiveSharesGate" }),
    client.readContract({ address: VAULT, abi: gateAbi, functionName: "sendSharesGate" }),
    client.readContract({ address: VAULT, abi: gateAbi, functionName: "receiveAssetsGate" }),
    client.readContract({ address: VAULT, abi: gateAbi, functionName: "sendAssetsGate" }),
  ]);
  const isZero = (a: Address) => a.toLowerCase() === ZERO_ADDRESS;
  return isZero(receiveShares) && isZero(sendShares) && isZero(receiveAssets) && isZero(sendAssets);
}

// Confirms on-chain that the configured asset and decimals are still the ones the
// UI assumes (vault.asset() === USDG, USDG.decimals() === 6) before any amount is trusted.
export async function readConfigValid(): Promise<boolean> {
  const [asset, decimals] = await Promise.all([
    client.readContract({ address: VAULT, abi: assetAbi, functionName: "asset" }),
    client.readContract({ address: USDG, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return asset.toLowerCase() === USDG.toLowerCase() && decimals === USDG_DECIMALS;
}
