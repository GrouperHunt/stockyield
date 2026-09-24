import type { Address, WalletClient } from "viem";

// Contract between the UI and a yield source. Capabilities are explicit: an
// adapter only exposes what it really implements, and is not assumed to behave
// like a generic ERC-4626 vault.
export type TxAction = "deposit" | "withdraw";
export type TxStep = "approval" | "deposit" | "withdraw" | "done" | "pending";

export type StrategyMetrics = {
  address: Address;
  name: string;
  totalAssetsUsd: number;
  liquidityUsd: number;
  sharePrice: number;
  netApy: number;
  avgNetApy: number;
  performanceFee: number;
  managementFee: number;
  listed: boolean;
  assetPriceUsd: number | null;
};

export type Position = {
  walletBalance: bigint;
  shares: bigint;
  assets: bigint;
  ethBalance: bigint;
};

export type StrategyInfo = {
  name: string;
  protocol: string;
  curator: string;
  network: string;
  chainId: number;
  asset: { symbol: string; address: Address; decimals: number };
  shareDecimals: number;
  vault: Address;
  explorer: string;
  strategyUrl: string;
};

export type ExecuteParams = {
  owner: Address;
  amount: bigint;
  wallet: WalletClient;
  hasShares: boolean;
  onStep: (step: TxStep) => void;
  onHash: (hash: string | null) => void;
};

export interface YieldStrategy {
  id: string;
  info: StrategyInfo;
  capabilities: { deposit: boolean; withdraw: boolean; accessGates: boolean };
  readMetrics(): Promise<{ metrics: StrategyMetrics; fetchedAt: string }>;
  readPosition(owner: Address): Promise<Position>;
  // true = open to any wallet, false = a gate is active. Only when capabilities.accessGates.
  readAccessOpen?(): Promise<boolean>;
  execute(action: TxAction, params: ExecuteParams): Promise<void>;
}

export type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: import("viem").EIP1193Provider;
};
