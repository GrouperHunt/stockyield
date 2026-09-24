"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { LOGO_SRC } from "@/components/brand-mark";

// The hero image: the logo ribbon, large, with a light that travels over its surface
// (a CSS mask made from the logo's own alpha, so the light only touches the ribbon) and a
// slight parallax that follows the mouse. The funds path leaves from its tail
// (`data-flow="tail"`, positioned as a fraction of the logo file, so swapping the logo
// only means adjusting TAIL below). Reduced motion: static, no light, no parallax.
export const TAIL = { x: 0.25, y: 0.815 };

export function HeroRibbon() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--mx", String((e.clientX / window.innerWidth - 0.5) * 2));
        el.style.setProperty("--my", String((e.clientY / window.innerHeight - 0.5) * 2));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[520px]" aria-hidden="true">
      <div ref={layer} className="ribbon-layer absolute inset-0">
        <Image src={LOGO_SRC} alt="" fill priority sizes="(min-width: 1024px) 520px, 80vw" className="object-contain" />
        <span className="ribbon-shine" />
      </div>
      <span data-flow="tail" className="absolute h-0 w-0" style={{ left: `${TAIL.x * 100}%`, top: `${TAIL.y * 100}%` }} />
    </div>
  );
}
