"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { DISCLAIMER, NON_AFFILIATION } from "@/lib/content";
import { BrandMark } from "./brand-mark";
import { TOKEN } from "@/lib/token";
import { XLink } from "./x-link";
import { useStockYield } from "./stockyield/provider";

export function SiteFooter() {
  const { info } = useStockYield();
  const clicks = useRef<number[]>([]);
  const [egg, setEgg] = useState(false);

  // The one easter egg: triple-click the wordmark. Purely visual (dots on the
  // funds path run faster for 3 s + a caption). Never touches wallet, transactions or data.
  const onWordmark = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 700), now];
    if (clicks.current.length >= 3 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clicks.current = [];
      window.dispatchEvent(new Event("sy-fast"));
      setEgg(true);
      setTimeout(() => setEgg(false), 3500);
    }
  };

  return (
    <footer className="on-dark mt-24 bg-graphite text-bg">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:px-8">
        <div>
          <button type="button" onClick={onWordmark} className="flex items-center gap-2.5 text-left" aria-label="StockYield">
            <BrandMark size={40} className="bg-mint" />
            <span className="text-2xl font-semibold tracking-[-0.04em]">StockYield</span>
          </button>
          <p className="mt-3 text-on-graphite-2">Put your onchain capital to work.</p>
          <div className="mt-4 flex items-center gap-3"><XLink className="border-white/25 text-bg hover:bg-white/10" /><span className="text-sm text-on-graphite-2">Follow StockYield on X</span></div>
          {TOKEN.address && (
            <div className="mt-5 text-sm">
              <p className="eyebrow">{TOKEN.symbol} token</p>
              <p className="mt-1 break-all font-mono text-xs">{TOKEN.address}</p>
              <div className="mt-1 flex gap-4">
                <button type="button" onClick={() => navigator.clipboard?.writeText(TOKEN.address!)} className="underline-offset-4 hover:underline">Copy address</button>
                <a className="underline-offset-4 hover:underline" href={`${info.explorer}/address/${TOKEN.address}`} target="_blank" rel="noreferrer">Explorer ↗</a>
              </div>
            </div>
          )}
          <p role="status" aria-live="polite" className={`mt-2 h-5 font-mono text-xs text-signal transition-opacity duration-500 ${egg ? "opacity-100" : "opacity-0"}`}>{egg ? "Interest is just patience, paid." : ""}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <ul className="space-y-2">
            <li className="eyebrow">Product</li>
            <li><Link className="hover:underline" href="/">Earn</Link></li>
            <li><Link className="hover:underline" href="/position">Position</Link></li>
            <li><Link className="hover:underline" href="/how-it-works">How it works</Link></li>
            <li><Link className="hover:underline" href="/risks">Risks &amp; FAQ</Link></li>
          </ul>
          <ul className="space-y-2">
            <li className="eyebrow">On-chain</li>
            <li><a className="hover:underline" href={`${info.explorer}/address/${info.vault}`} target="_blank" rel="noreferrer">Vault contract ↗</a></li>
            <li><a className="hover:underline" href={`${info.explorer}/address/${info.asset.address}`} target="_blank" rel="noreferrer">USDG contract ↗</a></li>
            <li><a className="hover:underline" href={info.strategyUrl} target="_blank" rel="noreferrer">Vault on Morpho ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-[1200px] space-y-1 px-4 py-6 text-xs text-on-graphite-2 md:px-8">
          <p>{DISCLAIMER}</p>
          <p>{NON_AFFILIATION}</p>
        </div>
      </div>
    </footer>
  );
}
