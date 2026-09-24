"use client";
import { useEffect, useRef } from "react";
import { LOGO_SRC } from "@/components/brand-mark";

type W = { a: number; k: number };
const w = ({ a, k }: W) => ({ "--a": a, "--k": k }) as React.CSSProperties;

const NODES = [
  { id: "wallet", title: "Your wallet", sub: "You sign every transaction" },
  { id: "vault", title: "Steakhouse USDG vault", sub: "Curated by Steakhouse" },
  { id: "markets", title: "Morpho lending markets", sub: "Where assets are lent" },
  { id: "borrowers", title: "Borrowers", sub: "Pay interest to lenders" },
] as const;

function Node({ x, y, wd, h, title, sub, win, mint = false }: { x: number; y: number; wd: number; h: number; title: string; sub: string; win: W; mint?: boolean }) {
  return (
    <g className="lit" style={w(win)}>
      <rect x={x} y={y} width={wd} height={h} rx={4} fill={mint ? "var(--mint)" : "var(--surface)"} stroke="var(--ink)" strokeWidth={1} />
      <text x={x + 16} y={y + 38} fontSize={15} fontWeight={550} fill="var(--ink)">{title}</text>
      <text x={x + 16} y={y + 62} fontSize={12} fill="var(--ink-2)">{sub}</text>
    </g>
  );
}

// The site's main image: funds path drawn in code and bound to scroll (--p).
// The StockYield node connects to the wallet with a dashed "prepares & simulates"
// line only; the solid funds line goes wallet → vault directly, so the diagram
// never implies funds pass through StockYield. Partner names are text, no logos.
export function FundsPath({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      el.style.setProperty("--p", Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.5 + r.height * 0.6))).toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    // Easter egg hook (footer): dots run faster for 3 seconds. Visual only.
    let timer: ReturnType<typeof setTimeout>;
    const fast = () => {
      const anims = [...el.querySelectorAll("animateMotion")];
      anims.forEach((a) => { a.setAttribute("data-dur", a.getAttribute("dur") ?? "5s"); a.setAttribute("dur", "1.1s"); });
      clearTimeout(timer);
      timer = setTimeout(() => anims.forEach((a) => a.setAttribute("dur", a.getAttribute("data-dur") ?? "5s")), 3000);
    };
    window.addEventListener("sy-fast", fast);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      window.removeEventListener("sy-fast", fast);
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const label = "Funds path: your wallet sends USDG directly to the Steakhouse USDG vault, which allocates it to Morpho lending markets. Borrowers pay interest. StockYield is only the interface that prepares and simulates the transaction; funds never pass through it.";

  return (
    <figure ref={ref} className={`fp ${className}`} aria-label="How your funds move">
      <ol className="sr-only">
        <li>StockYield interface: prepares and simulates the transaction. It holds no funds.</li>
        <li>Your wallet: you sign every transaction.</li>
        <li>Steakhouse USDG vault: receives your USDG directly from your wallet. Curated by Steakhouse.</li>
        <li>Morpho lending markets: the vault allocates assets here.</li>
        <li>Borrowers: pay interest to lenders.</li>
      </ol>

      {/* Desktop / tablet: horizontal */}
      <svg viewBox="0 0 1200 460" className="hidden h-auto w-full md:block" role="img" aria-label={label}>
        <title>How your funds move</title>
        {/* dashed: interface prepares and simulates (never carries funds) */}
        <g className="fade-in" style={w({ a: 0.05, k: 10 })}>
          <path d="M150 112 L150 190" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="4 5" fill="none" />
          <text x={164} y={156} fontSize={12} fill="var(--ink-2)" fontFamily="var(--font-mono)">prepares &amp; simulates</text>
        </g>
        {/* solid: funds */}
        <path className="draw" pathLength={1} style={w({ a: 0.16, k: 9 })} d="M260 236 L340 236" stroke="var(--ink)" strokeWidth={2} fill="none" />
        <path className="draw" pathLength={1} style={w({ a: 0.36, k: 9 })} d="M560 236 L640 236" stroke="var(--ink)" strokeWidth={2} fill="none" />
        <path className="draw" pathLength={1} style={w({ a: 0.56, k: 9 })} d="M860 236 L940 236" stroke="var(--ink)" strokeWidth={2} fill="none" />
        {[[300, 0.2, "deposit USDG"], [600, 0.4, "allocates"], [900, 0.6, "lends"]].map(([x, a, t]) => (
          <g key={t as string} className="fade-in" style={w({ a: a as number, k: 10 })}>
            <path d={`M${(x as number) + 34} 231 l8 5 l-8 5`} stroke="var(--ink)" strokeWidth={2} fill="none" />
            <text x={x as number} y={178} fontSize={11} textAnchor="middle" fill="var(--ink-2)" fontFamily="var(--font-mono)">{t as string}</text>
          </g>
        ))}
        {/* dotted: interest flows back */}
        <g className="fade-in" style={w({ a: 0.72, k: 6 })}>
          <path id="ret-h" d="M1050 282 C1050 410 450 410 450 282" stroke="var(--signal-ink)" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" fill="none" />
          <path d="M444 292 l6 -10 l6 10" stroke="var(--signal-ink)" strokeWidth={2} fill="none" />
          <text x={750} y={404} fontSize={12} textAnchor="middle" fill="var(--signal-ink)" fontFamily="var(--font-mono)">interest paid by borrowers</text>
        </g>
        {/* travelling dots (behind the nodes, so they pass through them) */}
        <g className="dot fade-in" style={w({ a: 0.86, k: 12 })}>
          <circle r={4} fill="var(--signal)" stroke="var(--ink)" strokeWidth={1}><animateMotion dur="5s" repeatCount="indefinite" path="M150 236 L1050 236" /></circle>
          <circle r={4} fill="var(--signal)" stroke="var(--ink)" strokeWidth={1}><animateMotion dur="5s" begin="2.5s" repeatCount="indefinite" path="M150 236 L1050 236" /></circle>
          <circle r={3.5} fill="var(--signal-ink)"><animateMotion dur="5s" repeatCount="indefinite" path="M1050 282 C1050 410 450 410 450 282" /></circle>
        </g>
        <Node x={40} y={20} wd={220} h={92} title="StockYield" sub="Interface · holds no funds" win={{ a: 0.02, k: 10 }} mint />
        <image href={LOGO_SRC} x={190} y={30} width={62} height={62} className="lit" style={w({ a: 0.02, k: 10 })} preserveAspectRatio="xMidYMid slice" />
        {NODES.map((n, i) => <Node key={n.id} x={40 + i * 300} y={190} wd={220} h={92} title={n.title} sub={n.sub} win={{ a: 0.08 + i * 0.2, k: 10 }} />)}
        <text x={40} y={446} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)">ALL STEPS RUN ON ROBINHOOD CHAIN</text>
      </svg>

      {/* Mobile: vertical */}
      <svg viewBox="0 0 380 700" className="mx-auto block h-auto w-full max-w-sm md:hidden" role="img" aria-label={label}>
        <title>How your funds move</title>
        <g className="fade-in" style={w({ a: 0.03, k: 10 })}>
          <path d="M60 94 L60 150" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="4 5" fill="none" />
          <text x={72} y={128} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)">prepares &amp; simulates</text>
        </g>
        {[[234, 290, 0.14, "deposit USDG"], [374, 430, 0.34, "allocates"], [514, 570, 0.54, "lends"]].map(([y1, y2, a, t]) => (
          <g key={t as string}>
            <path className="draw" pathLength={1} style={w({ a: a as number, k: 9 })} d={`M170 ${y1} L170 ${y2}`} stroke="var(--ink)" strokeWidth={2} fill="none" />
            <g className="fade-in" style={w({ a: (a as number) + 0.03, k: 10 })}>
              <path d={`M165 ${(y2 as number) - 8} l5 8 l5 -8`} stroke="var(--ink)" strokeWidth={2} fill="none" />
              <text x={184} y={((y1 as number) + (y2 as number)) / 2 + 4} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)">{t as string}</text>
            </g>
          </g>
        ))}
        <g className="fade-in" style={w({ a: 0.72, k: 6 })}>
          <path d="M310 612 C356 612 356 332 310 332" stroke="var(--signal-ink)" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" fill="none" />
          <path d="M318 338 l-8 -6 l8 -6" stroke="var(--signal-ink)" strokeWidth={2} fill="none" />
          <text transform="rotate(-90 354 472)" x={354} y={472} fontSize={11} textAnchor="middle" fill="var(--signal-ink)" fontFamily="var(--font-mono)">interest paid by borrowers</text>
        </g>
        <g className="dot fade-in" style={w({ a: 0.86, k: 12 })}>
          <circle r={4} fill="var(--signal)" stroke="var(--ink)" strokeWidth={1}><animateMotion dur="5s" repeatCount="indefinite" path="M170 192 L170 612" /></circle>
          <circle r={3.5} fill="var(--signal-ink)"><animateMotion dur="5s" repeatCount="indefinite" path="M310 612 C356 612 356 332 310 332" /></circle>
        </g>
        <Node x={20} y={10} wd={290} h={84} title="StockYield" sub="Interface · holds no funds" win={{ a: 0.02, k: 10 }} mint />
        <image href={LOGO_SRC} x={240} y={16} width={60} height={60} className="lit" style={w({ a: 0.02, k: 10 })} preserveAspectRatio="xMidYMid slice" />
        {NODES.map((n, i) => <Node key={n.id} x={20} y={150 + i * 140} wd={290} h={84} title={n.title} sub={n.sub} win={{ a: 0.08 + i * 0.2, k: 10 }} />)}
        <text x={20} y={690} fontSize={10} fill="var(--ink-2)" fontFamily="var(--font-mono)">ALL STEPS RUN ON ROBINHOOD CHAIN</text>
      </svg>
    </figure>
  );
}
