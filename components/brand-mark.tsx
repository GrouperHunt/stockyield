import Image from "next/image";

// The single place the StockYield logo is rendered (header, funds path start
// node, footer). The token logo is being redesigned: swap LOGO_SRC (or the file
// behind it) and every use updates. The delivered file is linked, never edited;
// the transparent PNG has wide padding, so zoom crops it visually with CSS only.
export const LOGO_SRC = "/brand/logo-transparent.png";

export function BrandMark({ size = 36, zoom = 1.55, className = "", priority = false }: { size?: number; zoom?: number; className?: string; priority?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image src={LOGO_SRC} alt="" width={size * 2} height={size * 2} priority={priority} className="absolute left-1/2 top-1/2 max-w-none" style={{ width: size * zoom, height: size * zoom, transform: "translate(-50%, -50%)" }} />
    </span>
  );
}
