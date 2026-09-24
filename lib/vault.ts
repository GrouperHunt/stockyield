import { defineChain, parseUnits, type Address, type EIP1193Provider } from "viem";

export const TRANSACTIONS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRANSACTIONS === "true";

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
export const gateAbi = [
  { type: "function", name: "receiveSharesGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "sendSharesGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "receiveAssetsGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "sendAssetsGate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export type Strategy = {
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

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Defense-in-depth: even though the address is a query parameter we control,
// this rejects a malformed or unexpectedly-shaped Morpho API response instead
// of silently rendering wrong numbers or routing funds against wrong assumptions.
export function parseStrategy(raw: unknown): Strategy | null {
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

export type Position = {
  walletBalance: bigint;
  shares: bigint;
  assets: bigint;
  ethBalance: bigint;
};

export type GateStatus = {
  allOpen: boolean;
  checkedAt: number;
};

export type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
};

export const cash = (n: number, d = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d }).format(n);
export const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
export const pct = (n?: number | null) => (n == null ? "—" : `${(n * 100).toFixed(2)}%`);
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Caps typed input at USDG's 6 decimals and rejects anything that isn't a plain
// non-negative decimal (multiple dots, letters, exponents, etc.).
export function sanitizeAmountInput(raw: string): string {
  const digitsAndDot = raw.replace(/[^0-9.]/g, "");
  const firstDot = digitsAndDot.indexOf(".");
  const normalized =
    firstDot === -1 ? digitsAndDot : digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, "");
  const [intPart, fracPart] = normalized.split(".");
  return fracPart === undefined ? intPart : `${intPart}.${fracPart.slice(0, USDG_DECIMALS)}`;
}

export function parseAmount(amount: string): bigint {
  if (!amount || Number(amount) <= 0) return 0n;
  try {
    return parseUnits(amount, USDG_DECIMALS);
  } catch {
    return 0n;
  }
}

// Patterns below are not guesses: they were produced by simulating real
// reverts from the deployed vault (via simulateContract on a forked copy of
// its actual state) — an underflow panic on an over-withdraw, and the vault's
// own TransferFromReverted custom error (selector 0xe65b7a77) on insufficient
// allowance. See VALIDATION.md for the reproduction.
// viem throws these when the receipt is not found within its wait window. The
// transaction was already sent and may still confirm, so it is not a failure.
export function isReceiptTimeout(e: unknown): boolean {
  const name = (e as { name?: string } | undefined)?.name ?? "";
  return name === "WaitForTransactionReceiptTimeoutError" || name === "TransactionReceiptNotFoundError";
}

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
