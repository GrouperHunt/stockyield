import Link from "next/link";
import { Reveal } from "@/components/motion";
import { SectionHead } from "@/components/page-header";
import { DetailsButton } from "@/components/stockyield/details-button";
import { EarnModule } from "@/components/stockyield/earn-module";
import { FlowPath, FundsFlowNodes } from "@/components/stockyield/funds-flow";
import { HeroRibbon } from "@/components/stockyield/hero-ribbon";
import { RiskSummary } from "@/components/stockyield/risk-summary";
import { StatStrip } from "@/components/stockyield/stat-strip";
import { YIELD_SOURCE } from "@/lib/content";

const FACTS = ["Non-custodial", "Robinhood Chain", "Powered by existing onchain protocols"];

export default function EarnPage() {
  return (
    <div className="relative">
      <FlowPath />
      <section className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-4 pb-20 pt-10 md:px-8 md:pt-16 lg:grid-cols-12 lg:gap-x-12 lg:pb-28">
        <div className="min-w-0 lg:col-span-7">
          <p className="eyebrow intro-fade">StockYield · USDG Earn</p>
          <h1 className="display mt-5">
            <span className="intro-line block">Put your USDG</span>
            <span className="intro-line block text-ink-2">to work.</span>
          </h1>
          <p className="lead intro-rise mt-7">Access the Steakhouse USDG vault on Morpho. Deposit directly from your wallet and track your position in one place.</p>
          <ul className="intro-rise mt-7 flex flex-wrap gap-2" aria-label="Key facts">
            {FACTS.map((f) => <li key={f} className="border bg-mint px-3 py-1.5 text-sm">{f}</li>)}
          </ul>
        </div>
        <div className="intro-rise min-w-0 lg:col-span-5"><HeroRibbon /></div>
        <span data-flow="hero-end" className="absolute inset-x-0 bottom-0 h-0" />
      </section>

      <section className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 md:px-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7"><EarnModule /></div>
        <div className="min-w-0 lg:col-span-5"><RiskSummary /></div>
      </section>

      <div className="relative z-10 mt-16"><StatStrip /></div>

      <section className="relative z-10 mx-auto max-w-[1200px] px-4 pt-20 md:px-8">
        <Reveal>
          <SectionHead eyebrow="01 · Yield source" title="Where does the yield come from?">
            <p>{YIELD_SOURCE}</p>
          </SectionHead>
        </Reveal>
        <FundsFlowNodes />
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <Link href="/how-it-works" className="text-signal-ink underline-offset-4 hover:underline">How it works →</Link>
          <DetailsButton className="text-signal-ink underline-offset-4 hover:underline" />
          <Link href="/risks" className="text-signal-ink underline-offset-4 hover:underline">Risks &amp; FAQ →</Link>
        </div>
      </section>
    </div>
  );
}
