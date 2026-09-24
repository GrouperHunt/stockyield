"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { useMetrics } from "@/hooks/use-metrics";
import { usePosition } from "@/hooks/use-position";
import { useSimulation } from "@/hooks/use-simulation";
import { useTransaction } from "@/hooks/use-transaction";
import { useWallet } from "@/hooks/use-wallet";
import { parseAmount } from "@/lib/format";
import { chain, CHAIN_ID, CHAIN_ID_HEX, EXPLORER, RPC_URL } from "@/lib/strategies/steakhouse-usdg/config";
import { steakhouseUsdg as strategy } from "@/lib/strategies/steakhouse-usdg";
import type { TxAction } from "@/lib/yield-strategy";
import { StrategyDetailsSheet } from "./strategy-details";
import { TxDialog } from "./tx-dialog";
import { WalletPicker } from "./wallet-picker";

const chainParams = { id: CHAIN_ID, idHex: CHAIN_ID_HEX, name: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrl: RPC_URL, explorer: EXPLORER };

function useStockYieldState() {
  const { info } = strategy;
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<TxAction>("deposit");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const m = useMetrics(strategy);
  const pos = usePosition(strategy);
  const wallet = useWallet(chainParams, {
    onConnected: (a: Address) => void pos.load(a),
    onAccountsChanged: (a) => {
      pos.reset();
      setAmount("");
      tx.invalidate();
      if (a) void pos.load(a);
    },
    onChainChanged: (a) => {
      if (a) void pos.load(a);
    },
  });
  const tx = useTransaction(strategy, { provider: wallet.provider, address: wallet.address, ensureChain: wallet.ensureChain });

  const decimals = info.asset.decimals;
  const position = pos.position;
  const parsed = parseAmount(amount, decimals);

  // Withdraw: the position's value (shares converted to assets) is the ceiling that is
  // enforced; the on-chain simulation decides whether it can actually be withdrawn now.
  // The API-reported liquidity only lowers what MAX fills in (a hint, never a block),
  // so a lagging third-party number can't stop a withdrawal the chain would allow.
  // maxWithdraw is not used: it is a hardcoded 0 in this Vault V2 (see config.ts).
  const positionValue = position?.assets ?? 0n;
  const price = m.metrics?.assetPriceUsd ?? null;
  const liquidityUnits = m.metrics && price !== null && price > 0 ? (m.metrics.liquidityUsd / price) * 10 ** decimals : null;
  const liquidityAssets = liquidityUnits !== null && Number.isFinite(liquidityUnits) && liquidityUnits >= 0 && liquidityUnits < Number.MAX_SAFE_INTEGER ? BigInt(Math.floor(liquidityUnits)) : null;
  const limitedByLiquidity = mode === "withdraw" && liquidityAssets !== null && liquidityAssets < positionValue;
  const balance = mode === "deposit" ? position?.walletBalance ?? 0n : positionValue;
  const maxAmount = limitedByLiquidity ? liquidityAssets! : balance;
  const enough = parsed > 0n && parsed <= balance;
  const hasShares = (position?.shares ?? 0n) > 0n;
  const hasGas = (position?.ethBalance ?? 0n) > 0n;

  const sim = useSimulation(strategy, {
    enabled: !!wallet.address && !wallet.wrongNetwork && enough,
    owner: wallet.address,
    action: mode,
    amount: parsed,
    refreshKey: `${tx.step}|${position?.walletBalance}|${position?.shares}`,
  });

  const run = (action: TxAction, value: bigint, shares: boolean) =>
    tx.run(action, value, shares, async () => {
      setAmount("");
      if (wallet.address) await pos.load(wallet.address);
    });

  return { strategy, info, m, pos, wallet, tx, sim, amount, setAmount, mode, setMode, detailsOpen, setDetailsOpen, parsed, balance, maxAmount, enough, hasShares, hasGas, limitedByLiquidity, run, decimals };
}

type Ctx = ReturnType<typeof useStockYieldState>;
const StockYieldContext = createContext<Ctx | null>(null);

export function useStockYield() {
  const c = useContext(StockYieldContext);
  if (!c) throw new Error("useStockYield must be used inside <StockYieldProvider>");
  return c;
}

export function StockYieldProvider({ children }: { children: ReactNode }) {
  const s = useStockYieldState();
  const { tx, wallet, info, pos } = s;
  return (
    <StockYieldContext.Provider value={s}>
      {children}
      <StrategyDetailsSheet open={s.detailsOpen} onOpenChange={s.setDetailsOpen} />
      <WalletPicker open={wallet.walletPicker} onOpenChange={wallet.setWalletPicker} wallets={wallet.wallets} onPick={wallet.connectWith} />
      <TxDialog
        open={tx.open}
        step={tx.step}
        action={tx.action}
        approvalNeeded={tx.approvalNeeded}
        failedAt={tx.failedAt}
        hash={tx.hash}
        error={tx.error}
        sim={tx.sim}
        explorer={info.explorer}
        onOpenChange={tx.setOpen}
        onClose={() => {
          tx.setOpen(false);
          if (wallet.address) void pos.load(wallet.address);
        }}
      />
    </StockYieldContext.Provider>
  );
}
