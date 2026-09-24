"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address, EIP1193Provider } from "viem";
import { toast } from "sonner";
import { describeTxError } from "@/lib/tx-errors";
import { ensureChain as ensureChainOn, type ChainParams } from "@/lib/wallet";
import type { EIP6963ProviderDetail } from "@/lib/yield-strategy";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

export type WalletHandlers = {
  onConnected: (address: Address) => void;
  // null = account list emptied or wallet disconnected
  onAccountsChanged: (address: Address | null) => void;
  onChainChanged: (address: Address | null) => void;
};

export function useWallet(chain: ChainParams, handlers: WalletHandlers) {
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [walletPicker, setWalletPicker] = useState(false);
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handlersRef = useRef(handlers);
  const addressRef = useRef(address);
  useEffect(() => {
    handlersRef.current = handlers;
    addressRef.current = address;
  });

  const checkNetwork = useCallback(
    async (p: EIP1193Provider) => {
      try {
        const hex = (await p.request({ method: "eth_chainId" })) as string;
        setWrongNetwork(parseInt(hex, 16) !== chain.id);
      } catch {
        setWrongNetwork(false);
      }
    },
    [chain.id],
  );

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
      handlersRef.current.onConnected(a);
      void checkNetwork(window.ethereum);
    });
  }, [checkNetwork]);

  // Keeps the UI honest about the live wallet/network instead of trusting
  // state captured at connect time: account switches, network switches, and
  // disconnects from the wallet extension all invalidate in-flight reads.
  useEffect(() => {
    if (!provider) return;
    const onAccountsChanged = (accounts: unknown) => {
      const a = ((accounts as string[])[0] as Address | undefined) ?? null;
      setAddress(a);
      handlersRef.current.onAccountsChanged(a);
    };
    const onChainChanged = () => {
      void checkNetwork(provider);
      handlersRef.current.onChainChanged(addressRef.current);
    };
    const onDisconnect = () => {
      setAddress(null);
      handlersRef.current.onAccountsChanged(null);
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
  }, [provider, checkNetwork]);

  const connectWith = async (p: EIP1193Provider) => {
    try {
      const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      const a = accounts[0] as Address;
      setProvider(p);
      setAddress(a);
      await checkNetwork(p);
      handlersRef.current.onConnected(a);
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
    await ensureChainOn(p, chain);
    setWrongNetwork(false);
  };

  const switchNetwork = async () => {
    if (!provider) return;
    setSwitching(true);
    try {
      await ensureChain(provider);
    } catch (e) {
      toast.error("Network not switched", { description: describeTxError(e) });
    } finally {
      setSwitching(false);
    }
  };

  return { wallets, walletPicker, setWalletPicker, provider, address, wrongNetwork, switching, connect, connectWith, ensureChain, switchNetwork };
}
