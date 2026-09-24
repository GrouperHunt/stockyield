import type { Address } from "viem";
import type { StrategyMetrics } from "@/lib/yield-strategy";
import { USDG, USDG_DECIMALS, VAULT } from "./config";

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Defense-in-depth: even though the address is a query parameter we control,
// this rejects a malformed or unexpectedly-shaped Morpho API response instead
// of silently rendering wrong numbers or routing funds against wrong assumptions.
export function parseMetrics(raw: unknown): StrategyMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const asset = v.asset as Record<string, unknown> | undefined;
  const price = asset?.price as Record<string, unknown> | undefined;
  if (
    typeof v.address !== "string" ||
    v.address.toLowerCase() !== VAULT.toLowerCase() ||
    !asset ||
    typeof asset.address !== "string" ||
    asset.address.toLowerCase() !== USDG.toLowerCase() ||
    asset.decimals !== USDG_DECIMALS ||
    !isFiniteNumber(v.totalAssets) ||
    !isFiniteNumber(v.liquidity) ||
    !isFiniteNumber(v.totalAssetsUsd) ||
    !isFiniteNumber(v.liquidityUsd) ||
    !isFiniteNumber(v.sharePrice) ||
    !isFiniteNumber(v.netApy) ||
    !isFiniteNumber(v.avgNetApy) ||
    !isFiniteNumber(v.performanceFee) ||
    !isFiniteNumber(v.managementFee)
  ) {
    return null;
  }
  return {
    address: v.address as Address,
    name: typeof v.name === "string" ? v.name : "Steakhouse USDG",
    totalAssets: v.totalAssets / 10 ** USDG_DECIMALS,
    liquidity: v.liquidity / 10 ** USDG_DECIMALS,
    totalAssetsUsd: v.totalAssetsUsd,
    liquidityUsd: v.liquidityUsd,
    sharePrice: v.sharePrice,
    netApy: v.netApy,
    avgNetApy: v.avgNetApy,
    performanceFee: v.performanceFee,
    managementFee: v.managementFee,
    listed: v.listed === true,
    assetPriceUsd: isFiniteNumber(price?.usd) ? (price.usd as number) : null,
  };
}

// Client-side read of our own normalizing route (/api/strategy).
export async function readMetrics(): Promise<{ metrics: StrategyMetrics; fetchedAt: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const r = await fetch("/api/strategy", { cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timeout));
  if (!r.ok) throw new Error("unavailable");
  const j = (await r.json()) as { strategy: StrategyMetrics; fetchedAt: string };
  if (!j.strategy) throw new Error("unavailable");
  return { metrics: j.strategy, fetchedAt: j.fetchedAt };
}
