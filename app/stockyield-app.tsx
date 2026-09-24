"use client";
import { useState } from "react";
import { ChevronRight, RefreshCw, ShieldCheck, WalletCards, Zap } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckLine, Metric } from "@/components/stockyield/atoms";
import { EarnModule } from "@/components/stockyield/earn-module";
import { PositionSection } from "@/components/stockyield/position-section";
import { StrategyDetails } from "@/components/stockyield/strategy-details";
import { TxDialog } from "@/components/stockyield/tx-dialog";
import { WalletPicker } from "@/components/stockyield/wallet-picker";
import { useMetrics } from "@/hooks/use-metrics";
import { usePosition } from "@/hooks/use-position";
import { useTransaction } from "@/hooks/use-transaction";
import { useWallet } from "@/hooks/use-wallet";
import { compact, pct, short } from "@/lib/format";
import { chain, CHAIN_ID, CHAIN_ID_HEX, EXPLORER, RPC_URL } from "@/lib/strategies/steakhouse-usdg/config";
import { steakhouseUsdg as strategy } from "@/lib/strategies/steakhouse-usdg";
import type { TxAction } from "@/lib/yield-strategy";

const chainParams = { id: CHAIN_ID, idHex: CHAIN_ID_HEX, name: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrl: RPC_URL, explorer: EXPLORER };

export default function StockYieldApp() {
  const { info } = strategy;
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<TxAction>("deposit");
  const [details, setDetails] = useState(false);

  const m = useMetrics(strategy);
  const pos = usePosition(strategy);
  const wallet = useWallet(chainParams, {
    onConnected: (a) => void pos.load(a),
    onAccountsChanged: (a) => {
      pos.reset();
      setAmount("");
      tx.setOpen(false);
      if (a) void pos.load(a);
    },
    onChainChanged: (a) => {
      if (a) void pos.load(a);
    },
  });
  const tx = useTransaction(strategy, { provider: wallet.provider, address: wallet.address, ensureChain: wallet.ensureChain });
  const { address } = wallet;

  return (
    <main className="min-h-screen bg-[#f4f5ef] text-[#152019]">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-[#f4f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#173f2c] text-[#b7f24a]"><Zap size={20} /></span>
            <span className="text-[21px] font-semibold tracking-[-.04em]">StockYield</span>
          </a>
          <div className="flex gap-3">
            <span className="hidden items-center gap-2 rounded-full border bg-white/60 px-3 py-2 text-sm text-[#536158] sm:flex">
              <i className="h-2 w-2 rounded-full bg-[#2a9f62]" />Robinhood Chain
            </span>
            <Button onClick={wallet.connect} className="h-11 rounded-full px-5"><WalletCards className="mr-2" size={17} />{address ? short(address) : "Connect wallet"}</Button>
          </div>
        </div>
      </header>
      {address && wallet.wrongNetwork && (
        <div className="bg-[#fbe9c9] px-5 py-2 text-center text-sm font-medium text-[#6b4a10]">
          Your wallet is on the wrong network. Switch to Robinhood Chain to deposit or withdraw.
        </div>
      )}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[1.38fr_.82fr] lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[30px] border bg-[#fcfdf9] shadow-[0_16px_45px_rgba(30,51,38,.07)]">
          <div className="border-b p-7 md:p-10">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4e9] px-3 py-1.5 text-sm font-medium text-[#21643f]"><ShieldCheck size={15} />Steakhouse · Morpho</span>
              <button onClick={m.refresh} className="flex items-center gap-2 text-sm text-[#657168]">
                <RefreshCw size={14} />{m.stale ? "Data may be stale — refresh" : m.fetchedAt ? `Fetched ${new Date(m.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading live data"}
              </button>
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-[#718078]">USDG EARN</p>
            <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.065em] md:text-7xl">Put your USDG<br />to work.</h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-[#5b675f]">Access the Steakhouse USDG vault on Morpho directly from your wallet. No custody. No StockYield smart contract.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            <Metric l="Net APY" v={m.error ? "Unavailable" : pct(m.metrics?.netApy)} green />
            <Metric l="Total deposits" v={m.metrics ? `$${compact(m.metrics.totalAssetsUsd)}` : "—"} />
            <Metric l="Liquidity" v={m.metrics ? `$${compact(m.metrics.liquidityUsd)}` : "—"} />
            <Metric l="Fees" v={m.metrics ? `${((m.metrics.performanceFee + m.metrics.managementFee) * 100).toFixed(2)}%` : "—"} />
          </div>
          <div className="grid border-t md:grid-cols-2">
            <div className="p-7 md:p-9">
              <h2 className="text-lg font-semibold">Where the yield comes from</h2>
              <p className="mt-3 leading-7 text-[#5b675f]">Your USDG is allocated by Steakhouse across Morpho lending markets. Borrowers pay interest for access to liquidity.</p>
              <button onClick={() => setDetails(true)} className="mt-6 flex items-center gap-1 text-sm font-semibold text-[#21643f]">View strategy & risks <ChevronRight size={16} /></button>
            </div>
            <div className="border-t bg-[#f8faf5] p-7 md:border-l md:border-t-0 md:p-9">
              <h2 className="text-lg font-semibold">Built for clear decisions</h2>
              <div className="mt-5 space-y-4 text-sm">
                <CheckLine t="Live data from Morpho" />
                <CheckLine t="Funds move wallet → vault" />
                <CheckLine t="Withdraw directly to your wallet" />
              </div>
            </div>
          </div>
        </section>
        <EarnModule
          info={info}
          mode={mode}
          onModeChange={setMode}
          amount={amount}
          onAmountChange={setAmount}
          metrics={m.metrics}
          dataError={m.error}
          dataStale={m.stale}
          gatesOpen={m.gatesOpen}
          position={pos.position}
          positionError={pos.error}
          address={address}
          hasProvider={!!wallet.provider}
          wrongNetwork={wallet.wrongNetwork}
          busy={tx.busy || wallet.switching}
          onConnect={wallet.connect}
          onSwitchNetwork={wallet.switchNetwork}
          onRun={(action, value, hasShares) => tx.run(action, value, hasShares, async () => { setAmount(""); if (address) await pos.load(address); })}
        />
      </div>
      <PositionSection info={info} address={address} position={pos.position} error={pos.error} metrics={m.metrics} onRefresh={() => address && pos.load(address)} />
      <footer className="border-t px-5 py-8 text-sm text-[#657168]">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 sm:flex-row">
          <span>Non-custodial interface. Yield is variable and capital is at risk. StockYield is not affiliated with Robinhood, Morpho Labs, or Steakhouse Financial.</span>
          <div className="flex gap-5">
            <a href={`${info.explorer}/address/${info.vault}`} target="_blank">Vault contract</a>
            <a href={info.strategyUrl} target="_blank">Morpho</a>
          </div>
        </div>
      </footer>
      <StrategyDetails open={details} onOpenChange={setDetails} info={info} metrics={m.metrics} />
      <WalletPicker open={wallet.walletPicker} onOpenChange={wallet.setWalletPicker} wallets={wallet.wallets} onPick={wallet.connectWith} />
      <TxDialog
        open={tx.open}
        busy={tx.busy}
        step={tx.step}
        hash={tx.hash}
        explorer={info.explorer}
        onOpenChange={tx.setOpen}
        onClose={() => { tx.setOpen(false); if (address) void pos.load(address); }}
      />
    </main>
  );
}
