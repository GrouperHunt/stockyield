import type { EIP1193Provider } from "viem";

export type ChainParams = {
  id: number;
  idHex: string;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  explorer: string;
};

// Switches the wallet to the required chain. Adds it only when the wallet
// reports it as unknown (4902); a rejection (4001) never triggers addChain.
export async function ensureChain(p: EIP1193Provider, c: ChainParams): Promise<void> {
  const currentHex = (await p.request({ method: "eth_chainId" })) as string;
  if (parseInt(currentHex, 16) === c.id) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: c.idHex }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await p.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: c.idHex, chainName: c.name, nativeCurrency: c.nativeCurrency, rpcUrls: [c.rpcUrl], blockExplorerUrls: [c.explorer] }],
      });
    } else if (code === 4001) {
      throw new Error(`You rejected the network switch. ${c.name} is required to continue.`);
    } else {
      throw new Error(`Could not switch to ${c.name}.`);
    }
  }
  const confirmHex = (await p.request({ method: "eth_chainId" })) as string;
  if (parseInt(confirmHex, 16) !== c.id) throw new Error(`Wallet is not on ${c.name}.`);
}
