"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatUnits, http, type Address, type EIP1193Provider } from "viem";
import { ArrowDownToLine, ArrowUpRight, Check, ChevronRight, CircleDollarSign, Clock3, ExternalLink, Info, Landmark, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, WalletCards, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, Toaster } from "sonner";
import {
  CHAIN_ID, CHAIN_ID_HEX, EXPLORER, RPC_URL, STRATEGY_STALE_MS, TRANSACTIONS_ENABLED, USDG, USDG_DECIMALS, VAULT, ZERO_ADDRESS,
  cash, chain, compact, describeTxError, erc20Abi, gateAbi, parseAmount, pct, sanitizeAmountInput, short, vaultAbi,
  type EIP6963ProviderDetail, type Position, type Strategy,
} from "@/lib/vault";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

const client = createPublicClient({ chain, transport: http() });

export default function StockYieldApp() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [dataError, setDataError] = useState(false);
  const [dataStale, setDataStale] = useState(false);

  const [gatesOpen, setGatesOpen] = useState<boolean | null>(null);
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [walletPicker, setWalletPicker] = useState(false);
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [positionError, setPositionError] = useState(false);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [step, setStep] = useState<"approval" | "deposit" | "withdraw" | "done">("approval");
  const [hash, setHash] = useState<string | null>(null);

  const requestRef = useRef(0);

  const loadStrategy = useCallback(async () => {
    setDataError(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("/api/strategy", { cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (!r.ok) throw new Error("unavailable");
      const j = (await r.json()) as { strategy: Strategy; fetchedAt: string };
      if (!j.strategy) throw new Error("unavailable");
      setStrategy(j.strategy);
      setFetchedAt(j.fetchedAt);
    } catch {
      setDataError(true);
    }
  }, []);

  useEffect(() => {
    if (!fetchedAt) return;
    const check = () => setDataStale(Date.now() - new Date(fetchedAt).getTime() > STRATEGY_STALE_MS);
    check();
    const i = setInterval(check, 15_000);
    return () => clearInterval(i);
  }, [fetchedAt]);

  const loadPosition = useCallback(async (owner: Address) => {
    const requestId = ++requestRef.current;
    try {
      const [walletBalance, shares, ethBalance] = await Promise.all([
        client.readContract({ address: USDG, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
        client.readContract({ address: VAULT, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
        client.getBalance({ address: owner }),
      ]);
      const assets = shares > 0n ? await client.readContract({ address: VAULT, abi: vaultAbi, functionName: "convertToAssets", args: [shares] }) : 0n;
      if (requestId !== requestRef.current) return; // a newer account/chain change superseded this read
      setPosition({ walletBalance, shares, ethBalance, assets });
      setPositionError(false);
    } catch {
      if (requestId !== requestRef.current) return;
      setPositionError(true);
    }
  }, []);

  // Live safety check, not a cap: confirms the vault's four gates are still
  // disabled (0x0 = open to any wallet), verified against the deployed vault's
  // actual source. If a gate is ever turned on, this flips to false and the
  // app stops claiming permissionless access instead of silently failing.
  const loadGates = useCallback(async () => {
    try {
      const [receiveShares, sendShares, receiveAssets, sendAssets] = await Promise.all([
        client.readContract({ address: VAULT, abi: gateAbi, functionName: "receiveSharesGate" }),
        client.readContract({ address: VAULT, abi: gateAbi, functionName: "sendSharesGate" }),
        client.readContract({ address: VAULT, abi: gateAbi, functionName: "receiveAssetsGate" }),
        client.readContract({ address: VAULT, abi: gateAbi, functionName: "sendAssetsGate" }),
      ]);
      const isZero = (a: Address) => a.toLowerCase() === ZERO_ADDRESS;
      setGatesOpen(isZero(receiveShares) && isZero(sendShares) && isZero(receiveAssets) && isZero(sendAssets));
    } catch {
      setGatesOpen(null);
    }
  }, []);

  const checkNetwork = useCallback(async (p: EIP1193Provider) => {
    try {
      const hex = (await p.request({ method: "eth_chainId" })) as string;
      setWrongNetwork(parseInt(hex, 16) !== CHAIN_ID);
    } catch {
      setWrongNetwork(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, then a 60s poll; loadStrategy owns its own try/catch and never throws.
    void loadStrategy();
    const i = setInterval(loadStrategy, 60_000);
    return () => clearInterval(i);
  }, [loadStrategy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read on mount, then a 5-minute poll; loadGates owns its own try/catch and never throws.
    void loadGates();
    const i = setInterval(loadGates, 5 * 60_000);
    return () => clearInterval(i);
  }, [loadGates]);

  // EIP-6963 wallet discovery: collects every injected provider that announces
  // itself instead of assuming window.ethereum is the only (or right) wallet.
  useEffect(() => {
    const onAnnounce = (event: WindowEventMap["eip6963:announceProvider"]) => {
      setWallets((prev) => (prev.some((w) => w.info.uuid === event.detail.info.uuid) ? prev : [...prev, event.detail]));
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  // Silent reconnect on load if a provider is already authorized, without
  // prompting a fresh connection popup.
  useEffect(() => {
    if (!window.ethereum) return;
    void window.ethereum.request({ method: "eth_accounts" }).then((x) => {
      const a = (x as string[])[0] as Address | undefined;
      if (!a || !window.ethereum) return;
      setProvider(window.ethereum);
      setAddress(a);
      void loadPosition(a);
      void checkNetwork(window.ethereum);
    });
  }, [loadPosition, checkNetwork]);

  const resetWalletState = useCallback(() => {
    setAddress(null);
    setPosition(null);
    setPositionError(false);
    setTxOpen(false);
    setAmount("");
  }, []);

  // Keeps the UI honest about the live wallet/network instead of trusting
  // state captured at connect time: account switches, network switches, and
  // disconnects from the wallet extension all invalidate in-flight reads.
  useEffect(() => {
    if (!provider) return;
    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list[0]) {
        resetWalletState();
        return;
      }
      const a = list[0] as Address;
      setAddress(a);
      setAmount("");
      setTxOpen(false);
      void loadPosition(a);
    };
    const onChainChanged = () => {
      void checkNetwork(provider);
      if (address) void loadPosition(address);
    };
    const onDisconnect = () => {
      resetWalletState();
      setProvider(null);
    };
    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);
    provider.on?.("disconnect", onDisconnect);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
      provider.removeListener?.("disconnect", onDisconnect);
    };
  }, [provider, address, loadPosition, checkNetwork, resetWalletState]);

  const connectWith = async (p: EIP1193Provider) => {
    try {
      const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      const a = accounts[0] as Address;
      setProvider(p);
      setAddress(a);
      await checkNetwork(p);
      await loadPosition(a);
    } catch (e) {
      const code = (e as { code?: number })?.code;
      toast.error(code === 4001 ? "Wallet connection was rejected." : "Wallet connection was cancelled.");
    }
  };

  const connect = async () => {
    if (wallets.length > 1) {
      setWalletPicker(true);
      return;
    }
    const p = wallets[0]?.provider ?? window.ethereum;
    if (!p) {
      toast.error("No EVM wallet found", { description: "Install MetaMask, Rabby or another browser wallet." });
      return;
    }
    await connectWith(p);
  };

  const ensureChain = async (p: EIP1193Provider) => {
    const currentHex = (await p.request({ method: "eth_chainId" })) as string;
    if (parseInt(currentHex, 16) === CHAIN_ID) return;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: CHAIN_ID_HEX, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER] }],
        });
      } else if (code === 4001) {
        throw new Error("You rejected the network switch. Robinhood Chain is required to continue.");
      } else {
        throw new Error("Could not switch to Robinhood Chain.");
      }
    }
    const confirmHex = (await p.request({ method: "eth_chainId" })) as string;
    if (parseInt(confirmHex, 16) !== CHAIN_ID) throw new Error("Wallet is not on Robinhood Chain.");
    setWrongNetwork(false);
  };

  const parsed = parseAmount(amount);

  // Withdraw ceiling uses the position's current value (shares converted to
  // assets), not maxWithdraw: verified against the deployed vault's own
  // source that maxWithdraw is a hardcoded `pure` function that always
  // returns 0 in this Vault V2, so it cannot be used as a real ceiling. The
  // actual on-chain constraint (real-time deallocatable liquidity) is instead
  // caught by simulateContract right before a signature is requested.
  const balance = mode === "deposit" ? position?.walletBalance ?? 0n : position?.assets ?? 0n;
  const enough = parsed > 0n && parsed <= balance;
  const hasShares = (position?.shares ?? 0n) > 0n;
  const hasGas = (position?.ethBalance ?? 0n) > 0n;
  const gatesConfirmedOpen = gatesOpen === true;
  const depositBlockedByStaleData = mode === "deposit" && dataStale;
  const withdrawAmountUsd = Number(amount || 0) * (strategy?.assetPriceUsd ?? 1);
  const liquidityHeadsUp = mode === "withdraw" && !!strategy && withdrawAmountUsd > strategy.liquidityUsd;

  const switchable = !!address && !!provider && wrongNetwork;
  const switchNetwork = async () => {
    if (!provider) return;
    setBusy(true);
    try {
      await ensureChain(provider);
    } catch (e) {
      toast.error("Network not switched", { description: describeTxError(e) });
    } finally {
      setBusy(false);
    }
  };

  const transact = async () => {
    if (!TRANSACTIONS_ENABLED) {
      toast.error("Transactions are not enabled yet");
      return;
    }
    if (!address || !provider) {
      await connect();
      return;
    }
    if (!enough || (mode === "deposit" && !strategy)) return;
    if (depositBlockedByStaleData) {
      toast.error("Vault data is stale", { description: "Refresh before depositing so you're not acting on outdated numbers." });
      return;
    }
    if (gatesOpen === false) {
      toast.error("A gate is currently active on this vault", { description: "Deposits or withdrawals may require allowlisting. Do not proceed until this is confirmed with Steakhouse/Morpho." });
      return;
    }
    setBusy(true);
    setTxOpen(true);
    setHash(null);
    setStep(mode === "deposit" ? "approval" : "withdraw");
    try {
      const liveAccounts = (await provider.request({ method: "eth_accounts" })) as string[];
      if (!liveAccounts[0] || liveAccounts[0].toLowerCase() !== address.toLowerCase()) {
        throw new Error("The connected wallet account changed. Reconnect and try again.");
      }
      await ensureChain(provider);
      const wallet = createWalletClient({ account: address, chain, transport: custom(provider) });

      if (mode === "deposit") {
        const allowance = await client.readContract({ address: USDG, abi: erc20Abi, functionName: "allowance", args: [address, VAULT] });
        if (allowance < parsed) {
          setStep("approval");
          await client.simulateContract({ account: address, address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, parsed] });
          const approveHash = await wallet.writeContract({ address: USDG, abi: erc20Abi, functionName: "approve", args: [VAULT, parsed] });
          setHash(approveHash);
          const approveReceipt = await client.waitForTransactionReceipt({ hash: approveHash });
          if (approveReceipt.status !== "success") throw new Error("The approval transaction reverted on-chain.");
        }

        setStep("deposit");
        setHash(null);
        await client.simulateContract({ account: address, address: VAULT, abi: vaultAbi, functionName: "deposit", args: [parsed, address] });
        const depositHash = await wallet.writeContract({ address: VAULT, abi: vaultAbi, functionName: "deposit", args: [parsed, address] });
        setHash(depositHash);
        const depositReceipt = await client.waitForTransactionReceipt({ hash: depositHash });
        if (depositReceipt.status !== "success") throw new Error("The deposit transaction reverted on-chain.");
      } else {
        if (!hasShares) throw new Error("You have no shares to withdraw.");
        setStep("withdraw");
        await client.simulateContract({ account: address, address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [parsed, address, address] });
        const withdrawHash = await wallet.writeContract({ address: VAULT, abi: vaultAbi, functionName: "withdraw", args: [parsed, address, address] });
        setHash(withdrawHash);
        const withdrawReceipt = await client.waitForTransactionReceipt({ hash: withdrawHash });
        if (withdrawReceipt.status !== "success") throw new Error("The withdrawal transaction reverted on-chain.");
      }

      setStep("done");
      setAmount("");
      await loadPosition(address);
    } catch (e) {
      setTxOpen(false);
      toast.error("Transaction not completed", { description: describeTxError(e) });
    } finally {
      setBusy(false);
    }
  };

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
            <Button onClick={connect} className="h-11 rounded-full px-5"><WalletCards className="mr-2" size={17} />{address ? short(address) : "Connect wallet"}</Button>
          </div>
        </div>
      </header>
      {address && wrongNetwork && (
        <div className="bg-[#fbe9c9] px-5 py-2 text-center text-sm font-medium text-[#6b4a10]">
          Your wallet is on the wrong network. Switch to Robinhood Chain to deposit or withdraw.
        </div>
      )}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[1.38fr_.82fr] lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[30px] border bg-[#fcfdf9] shadow-[0_16px_45px_rgba(30,51,38,.07)]">
          <div className="border-b p-7 md:p-10">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4e9] px-3 py-1.5 text-sm font-medium text-[#21643f]"><ShieldCheck size={15} />Steakhouse · Morpho</span>
              <button onClick={loadStrategy} className="flex items-center gap-2 text-sm text-[#657168]">
                <RefreshCw size={14} />{dataStale ? "Data may be stale — refresh" : fetchedAt ? `Fetched ${new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading live data"}
              </button>
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-[#718078]">USDG EARN</p>
            <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.065em] md:text-7xl">Put your USDG<br />to work.</h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-[#5b675f]">Access the Steakhouse USDG vault on Morpho directly from your wallet. No custody. No StockYield smart contract.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            <Metric l="Net APY" v={dataError ? "Unavailable" : pct(strategy?.netApy)} green />
            <Metric l="Total deposits" v={strategy ? `$${compact(strategy.totalAssetsUsd)}` : "—"} />
            <Metric l="Liquidity" v={strategy ? `$${compact(strategy.liquidityUsd)}` : "—"} />
            <Metric l="Fees" v={strategy ? `${((strategy.performanceFee + strategy.managementFee) * 100).toFixed(2)}%` : "—"} />
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
        <aside className="self-start rounded-[30px] bg-[#173f2c] p-2 text-white shadow-[0_22px_55px_rgba(23,63,44,.22)] lg:sticky lg:top-6">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); setAmount(""); }}>
            <TabsList className="grid h-13 w-full grid-cols-2 rounded-[22px] bg-[#0f3021] p-1.5">
              <TabsTrigger value="deposit" className="rounded-[17px] text-white/65 data-[state=active]:bg-white data-[state=active]:text-[#173f2c]">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw" className="rounded-[17px] text-white/65 data-[state=active]:bg-white data-[state=active]:text-[#173f2c]">Withdraw</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="m-0 p-5 pt-7 md:p-7">
              <div className="flex justify-between text-sm text-white/65">
                <span>{mode === "deposit" ? "Wallet balance" : "Available to withdraw"}</span>
                <span>{position ? `${Number(formatUnits(balance, USDG_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG` : positionError ? "Unavailable" : "Connect wallet"}</span>
              </div>
              <div className="mt-4 rounded-[22px] border border-white/12 bg-white/[.06] p-5">
                <div className="flex items-center gap-3">
                  <input aria-label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} placeholder="0.00" className="min-w-0 flex-1 bg-transparent text-4xl outline-none placeholder:text-white/25" />
                  <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-[#173f2c]"><CircleDollarSign size={17} />USDG</span>
                </div>
                <div className="mt-5 flex justify-between">
                  <span className="text-sm text-white/45">≈ {cash(Number(amount || 0) * (strategy?.assetPriceUsd ?? 1))}</span>
                  <button disabled={!position} onClick={() => setAmount(formatUnits(balance, USDG_DECIMALS))} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">MAX</button>
                </div>
              </div>
              {liquidityHeadsUp && (
                <p className="mt-3 flex items-start gap-2 text-xs text-[#f3d17a]"><Info size={14} className="mt-0.5 shrink-0" />This is more than the vault&apos;s last reported available liquidity ({cash(strategy?.liquidityUsd ?? 0, 0)}). It may still work if liquidity has since changed, or it may need to be split into smaller withdrawals.</p>
              )}
              <div className="my-6 space-y-3 text-sm">
                <Row l="Current APY" v={pct(strategy?.netApy)} />
                {mode === "deposit" && <Row l="Estimated annual yield" v={cash(Number(amount || 0) * (strategy?.netApy ?? 0))} />}
                <Row l="Destination" v="Steakhouse · Morpho" />
                <Row l="Network fee" v="Paid in ETH, shown in your wallet before you sign" />
              </div>
              <YieldCheck connected={!!address} data={mode === "withdraw" || (!!strategy && !dataError && !dataStale)} gas={hasGas} amount={!amount || enough} gatesOpen={gatesOpen} network={!wrongNetwork} />
              <Button
                disabled={switchable ? busy : !TRANSACTIONS_ENABLED || busy || gatesOpen === false || (mode === "deposit" && !strategy) || (!!address && (!enough || !hasGas || depositBlockedByStaleData))}
                onClick={switchable ? switchNetwork : transact}
                className="mt-5 h-14 w-full rounded-[18px] bg-[#b7f24a] text-base font-semibold text-[#173f2c] hover:bg-[#c4fa5d] disabled:bg-white/20 disabled:text-white/45"
              >
                {busy ? <LoaderCircle className="mr-2 animate-spin" /> : mode === "deposit" ? <ArrowDownToLine className="mr-2" size={19} /> : <ArrowUpRight className="mr-2" size={19} />}
                {switchable ? "Switch to Robinhood Chain" : !TRANSACTIONS_ENABLED ? "Transactions pending validation" : gatesOpen === false ? "Vault gate active — paused" : !address ? "Connect wallet" : mode === "deposit" ? "Earn with USDG" : "Withdraw USDG"}
              </Button>
              <p className="mt-4 text-center text-xs text-white/45">StockYield never receives or controls your funds.{gatesConfirmedOpen && " Verified open to any wallet — no allowlist."}</p>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
      <section className="mx-auto max-w-[1240px] px-5 pb-12 lg:px-8">
        <div className="rounded-[26px] border bg-[#fcfdf9] p-6 md:p-8">
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-sm text-[#718078]">My position</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {!address ? "Connect to view your position" : positionError ? "Position unavailable" : `${cash(Number(formatUnits(position?.assets ?? 0n, USDG_DECIMALS)) * (strategy?.assetPriceUsd ?? 1))} supplied`}
              </h2>
            </div>
            {address && <Button variant="outline" onClick={() => loadPosition(address)} className="rounded-full"><RefreshCw size={15} className="mr-2" />Refresh</Button>}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Position l="Current value" v={!address ? "—" : positionError ? "Unavailable" : cash(Number(formatUnits(position?.assets ?? 0n, USDG_DECIMALS)) * (strategy?.assetPriceUsd ?? 1))} />
            <Position l="Vault shares" v={!address ? "—" : positionError ? "Unavailable" : Number(formatUnits(position?.shares ?? 0n, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
            <Position l="Current APY" v={pct(strategy?.netApy)} />
          </div>
          <p className="mt-5 text-xs text-[#8a978f]">Net deposits and realized yield aren&apos;t shown because they require a verified transfer history for your shares, which isn&apos;t available yet. This is your current position value only, not a profit figure.</p>
        </div>
      </section>
      <footer className="border-t px-5 py-8 text-sm text-[#657168]">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 sm:flex-row">
          <span>Non-custodial interface. Yield is variable and capital is at risk. StockYield is not affiliated with Robinhood, Morpho Labs, or Steakhouse Financial.</span>
          <div className="flex gap-5">
            <a href={`${EXPLORER}/address/${VAULT}`} target="_blank">Vault contract</a>
            <a href="https://app.morpho.org/robinhood-chain/vault/0xBeEff033F34C046626B8D0A041844C5d1A5409dd/steakhouse-usdg" target="_blank">Morpho</a>
          </div>
        </div>
      </footer>
      <Sheet open={details} onOpenChange={setDetails}>
        <SheetContent className="w-full overflow-y-auto bg-[#f8faf5] p-0 sm:max-w-xl">
          <SheetHeader className="border-b p-7 text-left">
            <SheetTitle className="text-3xl">Steakhouse USDG</SheetTitle>
            <SheetDescription>A curated Morpho Vault V2 on Robinhood Chain.</SheetDescription>
          </SheetHeader>
          <div className="space-y-8 p-7">
            <section>
              <h3 className="font-semibold">Live strategy data</h3>
              <div className="mt-4 divide-y rounded-2xl border bg-white px-4">
                <Detail l="Net APY" v={pct(strategy?.netApy)} />
                <Detail l="Average net APY (trailing, window set by Morpho)" v={pct(strategy?.avgNetApy)} />
                <Detail l="Total deposits" v={strategy ? cash(strategy.totalAssetsUsd, 0) : "—"} />
                <Detail l="Available liquidity" v={strategy ? cash(strategy.liquidityUsd, 0) : "—"} />
                <Detail l="Management fee" v={strategy ? `${(strategy.managementFee * 100).toFixed(2)}%` : "—"} />
                <Detail l="Performance fee" v={strategy ? `${(strategy.performanceFee * 100).toFixed(2)}%` : "—"} />
                <Detail l="StockYield fee" v="0% — StockYield does not charge a fee" />
                <Detail l="Network gas" v="Paid by you, in ETH, set by the network" />
              </div>
            </section>
            <section>
              <h3 className="font-semibold">What can change</h3>
              <div className="mt-4 space-y-3">
                <Risk i={<RefreshCw />} t="Variable APY" d="Borrow demand and utilization change over time; past yield does not guarantee future yield." />
                <Risk i={<LockKeyhole />} t="Smart contract risk" d="Funds interact with Morpho Vault V2 and the lending markets it allocates to. A bug in any of these contracts could result in loss of funds." />
                <Risk i={<Clock3 />} t="Liquidity and withdrawal risk" d="If most vault liquidity is deployed to borrowers, a withdrawal can be delayed until liquidity is available. This app shows your live withdrawable amount before you submit." />
                <Risk i={<Landmark />} t="Curator and collateral risk" d="Steakhouse selects markets and allocation limits, but cannot eliminate the underlying risk of the markets it chooses. If a borrower's collateral is not liquidated in time to cover their debt, the resulting bad debt can reduce what lenders can withdraw." />
                <Risk i={<CircleDollarSign />} t="USDG depeg risk" d="USDG is intended to track $1 but its market price can deviate from that peg. This app converts your position using the live USDG/USD price when depositing and valuing your position." />
              </div>
            </section>
            <a href={`${EXPLORER}/address/${VAULT}`} target="_blank" className="flex items-center justify-between rounded-2xl border bg-white p-4 text-sm">
              <span><small className="block text-[#718078]">Vault contract</small><code>{short(VAULT)}</code></span>
              <ExternalLink size={17} />
            </a>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={walletPicker} onOpenChange={setWalletPicker}>
        <DialogContent className="rounded-[26px] bg-[#fcfdf9] sm:max-w-sm">
          <DialogHeader><DialogTitle>Choose a wallet</DialogTitle><DialogDescription>Multiple wallets were found in your browser.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {wallets.map((w) => (
              <button key={w.info.uuid} onClick={() => { setWalletPicker(false); void connectWith(w.provider); }} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left hover:bg-[#f4f5ef]">
                {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are arbitrary data: URLs announced at runtime by each wallet extension, not a static/optimizable asset. */}
                {w.info.icon && <img src={w.info.icon} alt="" className="h-8 w-8 rounded-lg" />}
                <span className="font-medium">{w.info.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={txOpen} onOpenChange={(o) => { if (!busy) setTxOpen(o); }}>
        <DialogContent className="rounded-[26px] bg-[#fcfdf9] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{step === "done" ? "Transaction confirmed" : "Confirm in your wallet"}</DialogTitle>
            <DialogDescription>{step === "approval" ? "Allow the vault to use the selected USDG." : step === "deposit" ? "Deposit USDG directly into Morpho." : step === "withdraw" ? "Return USDG to your wallet." : "Your position has been updated."}</DialogDescription>
          </DialogHeader>
          <div className="my-4 grid place-items-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#e6f4e9] text-[#21643f]">{step === "done" ? <Check size={36} /> : <LoaderCircle size={32} className="animate-spin" />}</span>
          </div>
          {hash && <a href={`${EXPLORER}/tx/${hash}`} target="_blank" className="flex justify-center gap-2 text-sm font-medium text-[#21643f]">View transaction <ExternalLink size={14} /></a>}
          {step === "done" && <Button onClick={() => setTxOpen(false)} className="mt-3 w-full">Done</Button>}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({ l, v, green = false }: { l: string; v: string; green?: boolean }) {
  return <div className="p-5 md:p-6"><p className="text-xs uppercase tracking-[.1em] text-[#718078]">{l}</p><p className={`mt-2 text-2xl font-semibold ${green ? "text-[#218b4e]" : ""}`}>{v}</p></div>;
}
function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-white/55">{l}</span><b className="text-right font-medium">{v}</b></div>;
}
function CheckLine({ t }: { t: string }) {
  return <div className="flex items-center gap-3"><i className="grid h-6 w-6 place-items-center rounded-full bg-[#e6f4e9] text-[#21643f]"><Check size={14} /></i>{t}</div>;
}
function Position({ l, v }: { l: string; v: string }) {
  return <div className="rounded-2xl bg-[#f0f2eb] p-5"><p className="text-sm text-[#718078]">{l}</p><p className="mt-2 text-xl font-semibold">{v}</p></div>;
}
function Detail({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between py-3.5 text-sm"><span className="text-[#718078]">{l}</span><b>{v}</b></div>;
}
function Risk({ i, t, d }: { i: React.ReactNode; t: string; d: string }) {
  return <div className="flex gap-4 rounded-2xl border bg-white p-4"><span className="mt-1 text-[#21643f] [&>svg]:h-5 [&>svg]:w-5">{i}</span><div><p className="font-medium">{t}</p><p className="mt-1 text-sm leading-6 text-[#657168]">{d}</p></div></div>;
}
function YieldCheck({ connected, data, gas, amount, gatesOpen, network }: { connected: boolean; data: boolean; gas: boolean; amount: boolean; gatesOpen: boolean | null; network: boolean }) {
  const gatesOk = gatesOpen !== false;
  const ready = connected && data && gas && amount && gatesOk && network;
  return (
    <div className="rounded-[18px] border border-white/12 bg-[#0f3021] p-4">
      <div className="flex justify-between">
        <span className="flex items-center gap-2 font-medium"><ShieldCheck size={17} />Yield Check</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-[#b7f24a] text-[#173f2c]" : "bg-white/10 text-white/65"}`}>{ready ? "Ready" : connected ? "Check details" : "Wallet needed"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55">
        <span className="flex gap-1">{data ? <Check size={13} /> : <Info size={13} />}Live vault data</span>
        <span className="flex gap-1">{network ? <Check size={13} /> : <Info size={13} />}Robinhood Chain</span>
        <span className="flex gap-1">{amount ? <Check size={13} /> : <Info size={13} />}Amount within balance</span>
        <span className="flex gap-1">{gatesOk ? <Check size={13} /> : <Info size={13} />}{gatesOpen === null ? "Gate status unknown" : "No allowlist gate active"}</span>
        <span className="flex gap-1">{gas ? <Check size={13} /> : <Info size={13} />}ETH for gas</span>
        <span className="flex gap-1"><Clock3 size={13} />APY is variable</span>
      </div>
    </div>
  );
}
