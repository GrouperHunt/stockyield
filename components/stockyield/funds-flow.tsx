"use client";
import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/brand-mark";

export const FLOW_NODES = [
  { id: "wallet", n: "01", title: "Your wallet", sub: "You sign every transaction", text: "Your USDG starts here and goes straight to the vault. StockYield never receives it." },
  { id: "vault", n: "02", title: "Steakhouse USDG vault", sub: "Curated by Steakhouse", text: "Receives your USDG and gives you vault shares, which stay in your wallet." },
  { id: "markets", n: "03", title: "Morpho lending markets", sub: "Where assets are lent", text: "The vault allocates its assets to lending markets on Morpho." },
  { id: "borrowers", n: "04", title: "Borrowers", sub: "Pay interest to lenders", text: "Borrowers pay interest. Returns vary with market conditions, allocations and fees." },
] as const;

// The nodes (plain HTML cards). The green path drawn by <FlowPath/> stops at each one.
export function FundsFlowNodes() {
  return (
    <div data-flow="track" className="mt-12">
      <ol className="space-y-10">
        {FLOW_NODES.map((n) => (
          <li key={n.id} className={n.id === "wallet" ? "grid gap-6 md:grid-cols-[minmax(0,34rem)_1fr] md:items-center" : ""}>
            <article data-flow={n.id} className="flow-card max-w-[34rem] border bg-surface p-5 transition-colors duration-500">
              <p className="eyebrow">{n.n} · {n.sub}</p>
              <h3 className="mt-3 text-xl font-medium tracking-tight">{n.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{n.text}</p>
            </article>
            {n.id === "wallet" && (
              <article data-flow="interface" className="max-w-[26rem] border border-dashed bg-mint p-5">
                <div className="flex items-center gap-3">
                  <BrandMark size={40} className="bg-surface" />
                  <div><p className="font-medium tracking-tight">StockYield</p><p className="text-xs text-ink-2">Interface · holds no funds</p></div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">Reads live data, simulates and prepares your transaction. It is connected to your wallet by a dashed line only: funds never pass through it.</p>
              </article>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-[34rem] text-xs text-ink-2">Every step runs on Robinhood Chain.</p>
    </div>
  );
}

type Pt = { x: number; y: number };
type Geo = { w: number; h: number; trackX: number; nodes: { id: string; y: number; left: number }[]; d0: string; iface: string | null; gradY: [number, number] };

// Overlay drawn behind the page content (pointer-events none). It starts at the ribbon's tail,
// sweeps under the hero, runs down the left margin and stops at each node; the drawing follows
// the scroll. SVG + CSS only. Reduced motion: drawn completely, static.
export function FlowPath() {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = ref.current?.parentElement;
    const el = svg.current;
    if (!root || !el) return;
    const q = (s: string) => root.querySelector<HTMLElement>(`[data-flow="${s}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let geo: Geo | null = null;
    let raf = 0;

    const build = () => {
      const rr = root.getBoundingClientRect();
      const rel = (r: DOMRect): Pt => ({ x: r.left - rr.left, y: r.top - rr.top });
      const tailEl = q("tail"); const endEl = q("hero-end"); const trackEl = q("track");
      if (!tailEl || !endEl || !trackEl) return;
      const T = rel(tailEl.getBoundingClientRect());
      const sweepY = rel(endEl.getBoundingClientRect()).y - 30;
      const trackX = Math.max(10, rel(trackEl.getBoundingClientRect()).x - 36);
      const nodes = ["wallet", "vault", "markets", "borrowers"].flatMap((id) => {
        const e = q(id); if (!e) return [];
        const r = e.getBoundingClientRect(); const p = rel(r);
        return [{ id, y: p.y + Math.min(40, r.height / 2), left: p.x }];
      });
      if (nodes.length < 4) return;
      const mid = (T.x + trackX) / 2;
      const d0 = `M${T.x} ${T.y} C ${T.x - 30} ${sweepY - 30}, ${mid} ${sweepY}, ${trackX + 70} ${sweepY} C ${trackX + 20} ${sweepY}, ${trackX} ${sweepY + 20}, ${trackX} ${sweepY + 70} L ${trackX} ${nodes[0].y}`;
      // dashed link wallet <-> StockYield interface (never carries funds)
      let iface: string | null = null;
      const w = q("wallet"), i = q("interface");
      if (w && i) {
        const a = w.getBoundingClientRect(), b = i.getBoundingClientRect();
        if (b.top >= a.bottom - 4) { const x = a.left - rr.left + 32; iface = `M${x} ${a.bottom - rr.top} L${x} ${b.top - rr.top}`; }
        else { const y = a.top - rr.top + a.height / 2; iface = `M${a.right - rr.left} ${y} L${b.left - rr.left} ${y}`; }
      }
      geo = { w: rr.width, h: rr.height, trackX, nodes, d0, iface, gradY: [T.y, nodes[3].y] };
      const $ = (s: string) => el.querySelector(s) as SVGElement;
      el.setAttribute("viewBox", `0 0 ${geo.w} ${geo.h}`);
      $("#fg").setAttribute("y1", String(geo.gradY[0])); $("#fg").setAttribute("y2", String(geo.gradY[1]));
      $("#s0").setAttribute("d", d0); $("#s0h").setAttribute("d", d0);
      nodes.forEach((n, k) => {
        if (k < 3) { const d = `M${trackX} ${n.y} L${trackX} ${nodes[k + 1].y}`; $(`#s${k + 1}`).setAttribute("d", d); $(`#s${k + 1}h`).setAttribute("d", d); }
        const c = $(`#n${k}`); c.setAttribute("cx", String(trackX)); c.setAttribute("cy", String(n.y));
        const l = $(`#c${k}`); l.setAttribute("d", `M${trackX} ${n.y} L${n.left} ${n.y}`);
      });
      const f = $("#iface"); if (iface) { f.setAttribute("d", iface); f.style.display = ""; } else f.style.display = "none";
      update();
    };

    const update = () => {
      raf = 0;
      if (!geo) return;
      const rr = root.getBoundingClientRect();
      const head = reduce ? Infinity : window.innerHeight * 0.72 - rr.top;
      const T = geo.gradY[0];
      const ys = [T, ...geo.nodes.map((n) => n.y)];
      for (let k = 0; k <= 3; k++) {
        // the head waits 28px past each node before the next stretch starts, so the path visibly stops at it
        const y0 = k === 0 ? ys[0] : ys[k] + 28, y1 = ys[k + 1];
        const p = Math.min(1, Math.max(0, (head - y0) / Math.max(1, y1 - y0)));
        for (const id of [`#s${k}`, `#s${k}h`]) (el.querySelector(id) as SVGElement).style.strokeDashoffset = String(1 - p);
      }
      geo.nodes.forEach((n, k) => {
        const lit = head >= n.y - 6;
        const dot = el.querySelector(`#n${k}`) as SVGElement, card = q(n.id), con = el.querySelector(`#c${k}`) as SVGElement;
        if (dot.dataset.lit !== String(lit)) { dot.dataset.lit = String(lit); con.style.opacity = lit ? "1" : "0"; if (card) card.dataset.lit = String(lit); }
      });
      (el.querySelector("#iface") as SVGElement).style.opacity = head >= geo.nodes[0].y ? "1" : "0";
    };

    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    const rebuild = () => build();
    build();
    const ro = new ResizeObserver(rebuild); ro.observe(root);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", rebuild);
    window.addEventListener("load", rebuild);
    void document.fonts?.ready.then(rebuild);
    const late = setTimeout(rebuild, 600);
    return () => { ro.disconnect(); window.removeEventListener("scroll", on); window.removeEventListener("resize", rebuild); window.removeEventListener("load", rebuild); clearTimeout(late); cancelAnimationFrame(raf); };
  }, []);

  const stroke = { fill: "none", stroke: "url(#fg)", strokeLinecap: "round" as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 };
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <svg ref={svg} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          {/* same greens as the logo ribbon: deep green, bright mint highlight, mid green */}
          <linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000">
            <stop offset="0" stopColor="#12a35c" /><stop offset="0.28" stopColor="#5cf0a3" /><stop offset="0.55" stopColor="#1fbe6b" /><stop offset="0.8" stopColor="#3ddc8a" /><stop offset="1" stopColor="#0f8f4c" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <path id={`s${k}`} {...stroke} strokeWidth={5} />
            <path id={`s${k}h`} {...stroke} stroke="#dffff0" strokeOpacity={0.55} strokeWidth={1.5} />
          </g>
        ))}
        <path id="iface" fill="none" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="4 5" style={{ opacity: 0, transition: "opacity .6s" }} />
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <path id={`c${k}`} fill="none" stroke="#1fbe6b" strokeWidth={3} strokeLinecap="round" style={{ opacity: 0, transition: "opacity .5s" }} />
            <circle id={`n${k}`} className="flow-dot" r={8} strokeWidth={2.5} />
          </g>
        ))}
      </svg>
    </div>
  );
}
