import type { Address, WalletClient } from "viem";

// Contract between the UI and a yield source. Capabilities are explicit: an
// adapter only exposes what it really implements, and is not assumed to behave
// like a generic ERC-4626 vault.
export type TxAction = "deposit" | "withdraw";
export type TxStep = "approval" | "deposit" | "withdraw" | "done" | "pending" | "failed" | "rejected";

// Result of a pre-signature simulation. "failed" = the contract would revert;
// "unavailable" = we could not run the check (RPC/network), which is not a pass.
export type SimResult =
  | { status: "passed"; step: "approval" | "deposit" | "withdraw"; feeWei: bigint | null }
  | { status: "failed"; reason: string }
  | { status: "unavailable"; reason: string };
export type SimState = { status: "idle" | "checking" } | SimResult;

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
  docsUrl: string;
  vaultDocsNote: string;
};

export type ExecuteParams = {
  owner: Address;
  amount: bigint;
  wallet: WalletClient;
  hasShares: boolean;
  onStep: (step: TxStep) => void;
  onHash: (hash: string | null) => void;
  onSim?: (sim: SimState) => void;
};

export interface YieldStrategy {
  id: string;
  info: StrategyInfo;
  capabilities: { deposit: boolean; withdraw: boolean; accessGates: boolean };
  readMetrics(): Promise<{ metrics: StrategyMetrics; fetchedAt: string }>;
  readPosition(owner: Address): Promise<Position>;
  // true = open to any wallet, false = a gate is active. Only when capabilities.accessGates.
  readAccessOpen?(): Promise<boolean>;
  // true = on-chain asset/decimals match this adapter's configuration.
  readConfigValid?(): Promise<boolean>;
  simulate(action: TxAction, params: { owner: Address; amount: bigint }): Promise<SimResult>;
  execute(action: TxAction, params: ExecuteParams): Promise<void>;
}

export type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: import("viem").EIP1193Provider;
};
