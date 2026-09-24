import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StockYieldProvider } from "@/components/stockyield/provider";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const base = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
const description = "Access the Steakhouse USDG vault on Morpho through a simple, non-custodial interface on Robinhood Chain.";
const banner = { url: "/brand/banner-x-1500x500.png", width: 1500, height: 500, alt: "StockYield — Put your onchain capital to work." };

export const metadata: Metadata = {
  metadataBase: new URL(base ? `https://${base}` : "http://localhost:3000"),
  title: { default: "StockYield — Put your USDG to work", template: "%s · StockYield" },
  description,
  icons: {
    icon: [
      { url: "/brand/favicon.ico" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: { title: "StockYield — Put your USDG to work", description, siteName: "StockYield", type: "website", images: [banner] },
  twitter: { card: "summary_large_image", title: "StockYield — Put your USDG to work", description, images: [banner.url] },
};

// Runs before first paint: enables .js-only motion styles and decides whether the opening animation
// (about 1 s) plays. It plays once per session, any input skips it (also before React hydrates), and
// it is off under prefers-reduced-motion.
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');var r=false,s=false;try{r=matchMedia('(prefers-reduced-motion: reduce)').matches;s=sessionStorage.getItem('sy-intro')==='1'}catch(e){}if(r||s){d.dataset.intro='done';return}d.dataset.intro='play';var ev=['pointerdown','keydown','wheel','touchstart'];function f(){d.dataset.intro='done';try{sessionStorage.setItem('sy-intro','1')}catch(e){}ev.forEach(function(e){removeEventListener(e,f)})}ev.forEach(function(e){addEventListener(e,f,{passive:true})});setTimeout(f,1000)})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="antialiased">
        <a href="#main" className="sr-only z-50 bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <StockYieldProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-center" />
        </StockYieldProvider>
      </body>
    </html>
  );
}
