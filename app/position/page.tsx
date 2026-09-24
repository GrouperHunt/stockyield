import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EarnModule } from "@/components/stockyield/earn-module";
import { PositionCard } from "@/components/stockyield/position-card";

export const metadata: Metadata = { title: "Position", description: "Your position in the Steakhouse USDG vault, read directly from Robinhood Chain, with deposit and withdraw." };

export default function PositionPage() {
  return (
    <>
      <PageHeader eyebrow="02 · Position" title="Your position">
        The current value of your shares in the Steakhouse USDG vault, read directly on-chain. Deposit more or withdraw from here.
      </PageHeader>
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 md:px-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7"><PositionCard /></div>
        <div className="min-w-0 lg:col-span-5 lg:self-start"><EarnModule /></div>
      </section>
    </>
  );
}
