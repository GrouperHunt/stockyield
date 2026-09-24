import { parseUnits } from "viem";

export const cash = (n: number, d = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d }).format(n);
export const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
export const pct = (n?: number | null) => (n == null ? "—" : `${(n * 100).toFixed(2)}%`);
// Fee rates: a known zero reads "0%" (never "0.00%", which looks like a placeholder).
export const feePct = (n: number) => (n === 0 ? "0%" : `${(n * 100).toFixed(2)}%`);
export const usdg = (n: number) => `${compact(n)} USDG`;
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Caps typed input at the asset's decimals and rejects anything that isn't a
// plain non-negative decimal (multiple dots, letters, exponents, etc.).
export function sanitizeAmountInput(raw: string, decimals: number): string {
  const digitsAndDot = raw.replace(/[^0-9.]/g, "");
  const firstDot = digitsAndDot.indexOf(".");
  const normalized =
    firstDot === -1 ? digitsAndDot : digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, "");
  const [intPart, fracPart] = normalized.split(".");
  return fracPart === undefined ? intPart : `${intPart}.${fracPart.slice(0, decimals)}`;
}

export function parseAmount(amount: string, decimals: number): bigint {
  if (!amount || Number(amount) <= 0) return 0n;
  try {
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
}
