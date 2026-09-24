import type { YieldStrategy } from "@/lib/yield-strategy";
import { CHAIN_ID, EXPLORER, SHARE_DECIMALS, USDG, USDG_DECIMALS, VAULT } from "./config";
import { readMetrics } from "./metrics";
import { readAccessOpen, readPosition } from "./position";
import { execute } from "./transactions";

export const steakhouseUsdg: YieldStrategy = {
  id: "steakhouse-usdg",
  info: {
    name: "Steakhouse USDG",
    protocol: "Morpho",
    curator: "Steakhouse",
    network: "Robinhood Chain",
    chainId: CHAIN_ID,
    asset: { symbol: "USDG", address: USDG, decimals: USDG_DECIMALS },
    shareDecimals: SHARE_DECIMALS,
    vault: VAULT,
    explorer: EXPLORER,
    strategyUrl: "https://app.morpho.org/robinhood-chain/vault/0xBeEff033F34C046626B8D0A041844C5d1A5409dd/steakhouse-usdg",
  },
  capabilities: { deposit: true, withdraw: true, accessGates: true },
  readMetrics,
  readPosition,
  readAccessOpen,
  execute,
};
