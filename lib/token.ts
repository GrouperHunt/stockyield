import type { Address } from "viem";

// The SYELD token is separate from the vault strategy: it is never needed to deposit,
// withdraw or earn. Set `address` to the VERIFIED contract address (checked on-chain:
// `node tests/verify-token.mjs <address>`) and the footer shows it, with copy and
// explorer links, on every page. While it is null nothing about the token is shown.
export const TOKEN: { symbol: "SYELD"; address: Address | null } = {
  symbol: "SYELD",
  address: null,
};
