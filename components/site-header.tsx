"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { short } from "@/lib/format";
import { BrandMark } from "./brand-mark";
import { XLink } from "./x-link";
import { useStockYield } from "./stockyield/provider";

const NAV = [
  { href: "/", label: "Earn" },
  { href: "/position", label: "Position" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/risks", label: "Risks" },
];

function NetworkChip({ className = "" }: { className?: string }) {
  const { info } = useStockYield();
  return (
    <span className={`items-center gap-2 border border-line bg-surface px-3 py-1.5 text-sm ${className}`}>
      <i className="live-dot h-2 w-2 rounded-full bg-signal" aria-hidden />
      {info.network}
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { wallet, info } = useStockYield();

  // Thin scroll-progress line under the header (CSS var only, no re-render).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty("--page-progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="intro-fade sticky top-0 z-40 border-b bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-3 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="StockYield — Earn">
            <BrandMark size={36} priority />
            <span className="text-xl font-semibold tracking-[-0.04em]">StockYield</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`relative px-3 py-2 text-sm transition-colors hover:text-ink ${active(n.href) ? "text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-ink" : "text-ink-2"}`}>{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <XLink className="hidden md:grid" />
            <NetworkChip className="hidden md:inline-flex" />
            <button
              onClick={wallet.connect}
              className="inline-flex h-10 items-center gap-2 rounded-sm bg-signal px-4 text-sm font-semibold text-ink transition-[transform,background-color] hover:bg-signal/90 active:translate-y-px"
            >
              {wallet.address ? <span className="num">{short(wallet.address)}</span> : "Connect Wallet"}
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button aria-label="Open menu" className="grid h-10 w-10 place-items-center border md:hidden"><Menu size={18} /></button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] max-w-xs bg-bg">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <nav aria-label="Mobile" className="mt-10 flex flex-col">
                  {NAV.map((n) => (
                    <SheetClose asChild key={n.href}>
                      <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`border-b px-6 py-4 text-lg ${active(n.href) ? "font-semibold" : "text-ink-2"}`}>{n.label}</Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="px-6 pt-6"><XLink /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-signal" style={{ transform: "scaleX(var(--page-progress, 0))" }} />
      </header>
      <div className="border-b bg-mint-soft md:hidden">
        <p className="mx-auto flex max-w-[1200px] items-center gap-2 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2">
          <i className="live-dot h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />{info.network} · chain ID <span className="num">{info.chainId}</span>
        </p>
      </div>
      {wallet.address && wallet.wrongNetwork && (
        <div role="status" className="border-b bg-[#f3e3bf] px-4 py-2 text-center text-sm font-medium text-warn">
          Your wallet is on the wrong network. Switch to Robinhood Chain to deposit or withdraw.
        </div>
      )}
    </>
  );
}
