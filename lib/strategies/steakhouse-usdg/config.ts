import { createPublicClient, defineChain, http, type Address } from "viem";

// Confirmed on-chain (eth_call against the RPC below) before shipping:
// vault.asset() === USDG, vault.decimals() === 18, USDG.decimals() === 6.
// Re-verify if any of these addresses ever change.
//
// IMPORTANT — verified against the deployed vault's actual source
// (morpho-org/vault-v2, src/VaultV2.sol) and against the deployed bytecode:
// maxDeposit/maxMint/maxWithdraw/maxRedeem are hardcoded `pure` functions that
// ALWAYS return 0 in this Vault V2 implementation ("Gross underestimation
// because being revert-free cannot be guaranteed when calling the gate.").
// They must NEVER be used as a capacity/cap check — doing so blocks every
// deposit and shows "0 available" for every withdrawal, unconditionally. The
// real, permissionless-by-default gating lives in four separate gate
// contracts (receiveSharesGate/sendSharesGate/receiveAssetsGate/
// sendAssetsGate), each disabled when set to the zero address. Read directly
// from the deployed vault on 2026-09-23 at block 70,656,028: all four gates
// are 0x0 — deposits and withdrawals are open to any wallet, no allowlist.
// The one real constraint left is the liquidity adapter's per-market caps
// (deposit) and deallocatable liquidity (withdraw); both surface as a plain
// on-chain revert, which is why every transaction is simulated before it is
// ever sent to the wallet for a signature (see transact() in stockyield-app).
export const CHAIN_ID = 4663;
export const CHAIN_ID_HEX = "0x1237";
export const VAULT = "0xBeEff033F34C046626B8D0A041844C5d1A5409dd" as Address;
export const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;
export const USDG_DECIMALS = 6;
export const SHARE_DECIMALS = 18;
export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

// Deposits/withdrawals stop counting live data as trustworthy after this many
// missed refresh cycles (refresh runs every 60s from the client).
export const STRATEGY_STALE_MS = 3 * 60_000;

export const chain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Blockscout", url: EXPLORER } },
});

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

// Vault surface actually used for reads/writes. maxDeposit/maxWithdraw are
// deliberately NOT included: verified (see note above) to always return 0 in
// this Vault V2, so they are useless for capacity checks and are not read.
export const vaultAbi = [
  ...erc20Abi,
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

// Read-only diagnostics: confirms at runtime that the four gates are still
// disabled (0x0) before showing the deposit/withdraw UI as available. This is
// a live safety check, not a cap — if Steakhouse ever turns a gate on, this
// catches it and the app should stop claiming permissionless access.
export const assetAbi = [
  { type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const gateAbi = [
  { type: "function", name: "receiveSharesGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "sendSharesGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "receiveAssetsGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "sendAssetsGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const publicClient = createPublicClient({ chain, transport: http() });
