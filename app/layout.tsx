import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockYield — USDG Yield on Robinhood Chain",
  description: "Put your USDG to work through a non-custodial interface to the Steakhouse USDG vault on Morpho, on Robinhood Chain.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
