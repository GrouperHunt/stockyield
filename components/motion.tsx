"use client";
import { useEffect, useRef, type ReactNode } from "react";

// Enter-on-scroll wrapper: fades/rises once when it first becomes visible.
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.in = "true";
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.dataset.in = "true";
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}
