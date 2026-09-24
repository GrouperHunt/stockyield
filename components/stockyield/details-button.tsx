"use client";
import { useStockYield } from "./provider";

export function DetailsButton({ children = "Strategy details", className = "" }: { children?: React.ReactNode; className?: string }) {
  const { setDetailsOpen } = useStockYield();
  return <button onClick={() => setDetailsOpen(true)} className={className}>{children}</button>;
}
