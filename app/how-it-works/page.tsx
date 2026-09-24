import type { Metadata } from "next";
import { PageHeader, SectionHead } from "@/components/page-header";
import { Reveal } from "@/components/motion";
import { FundsPath } from "@/components/stockyield/funds-path";
import { StateMark } from "@/components/stockyield/state-mark";
import { StrategyDetailsContent } from "@/components/stockyield/strategy-details";

export const metadata: Metadata = { title: "How it works", description: "How your USDG moves from your wallet to the Steakhouse USDG vault on Morpho, who does what, and what Yield Check verifies." };

const STEPS = [
  ["Connect", "Connecting reads your public address and balances. It moves nothing and needs no account, email or password."],
  ["Enter an amount", "Yield Check simulates the next transaction against the live chain and estimates the network fee, before you sign anything."],
  ["Approve (only if needed)", "The vault is allowed to take exactly the USDG amount you entered, not more. If your allowance is already enough this step is skipped."],
  ["Deposit", "USDG goes directly from your wallet to the vault contract. You receive vault shares in your own wallet. StockYield never holds either."],
  ["Withdraw", "You return shares and receive USDG in your wallet, when the contract's conditions and the available liquidity allow it. It is simulated first."],
];

const ROLES = [
  ["StockYield", "The interface", "Shows live data, prepares and simulates transactions, and reads your position. It has no smart contract for this strategy, holds no funds or keys, and does not manage the vault."],
  ["Steakhouse", "Vault curator", "Curates the vault's strategy according to the roles configured in the vault contract. StockYield is not affiliated with Steakhouse and does not manage the vault's allocations."],
  ["Morpho", "Lending infrastructure", "The protocol that provides the lending markets the vault allocates to, where borrowers pay interest. StockYield is not affiliated with Morpho."],
  ["Robinhood Chain", "The network", "The network on which every transaction runs and every balance is read. It is where you pay the network fee, in ETH."],
];

const QUESTIONS = [
  ["Where do the funds go?", "Names the destination and checks that your wallet is on the right network."],
  ["Where does the yield come from?", "Explains the source of the return: borrower interest in the underlying lending markets. Informational, so it carries no check mark."],
  ["What will it cost?", "Estimates the network fee from a real gas estimate, checks you hold ETH for it, and lists the vault's fees. StockYield charges none."],
  ["What can limit withdrawal?", "Shows reported liquidity and checks whether an allowlist gate is active on the vault."],
  ["Are data and simulation current?", "Checks how old the vault data is and whether the simulated transaction would succeed right now."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="03 · How it works" title="From your wallet to the vault, without passing through us.">
        StockYield is the interface. This page shows where your funds go, who does what, what Yield Check verifies and where every number comes from.
      </PageHeader>

      <section className="mx-auto max-w-[1200px] px-4 md:px-8">
        <h2 className="sr-only">The path of your funds</h2>
        <div className="border bg-surface p-4 md:p-8"><FundsPath /></div>
        <ol className="mt-10 grid gap-px border bg-line md:grid-cols-5">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-surface p-5">
              <Reveal delay={i * 60}>
                <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-medium tracking-tight">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pt-24 md:px-8">
        <SectionHead eyebrow="01 · Roles" title="Who does what.">
          <p>Four parties appear in this product. They are independent of each other, and named here as plain text only.</p>
        </SectionHead>
        <div className="mt-10 grid gap-px border bg-line sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(([name, role, text], i) => (
            <div key={name} className="bg-surface p-6">
              <Reveal delay={i * 60}>
                <p className="eyebrow">{role}</p>
                <h3 className="mt-3 text-xl font-medium tracking-tight">{name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{text}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="on-dark mt-24 bg-graphite text-bg">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8">
          <SectionHead eyebrow="02 · Yield Check" title="Understand the transaction before you sign it.">
            <p className="text-on-graphite-2">Five questions, answered with checks that really ran. Each check is Passed, Failed or Unavailable: unknown is never shown as a pass.</p>
          </SectionHead>
          <ol className="mt-10 grid gap-px border border-white/15 bg-white/15 md:grid-cols-5">
            {QUESTIONS.map(([q, a]) => (
              <li key={q} className="bg-graphite p-5">
                <h3 className="font-medium tracking-tight">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-graphite-2">{a}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 bg-bg p-6 text-ink md:grid-cols-3">
            <p className="text-sm"><StateMark state="passed" /><span className="mt-2 block text-ink-2">The check ran and succeeded.</span></p>
            <p className="text-sm"><StateMark state="failed" /><span className="mt-2 block text-ink-2">The check ran and found a problem, with the reason.</span></p>
            <p className="text-sm"><StateMark state="unavailable" /><span className="mt-2 block text-ink-2">The check could not run (no wallet yet, network error). Not a pass.</span></p>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-on-graphite-2">A passed simulation is not a security assessment of the protocol. It only says the next transaction would succeed against the chain as it is right now.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pt-24 md:px-8">
        <SectionHead eyebrow="03 · Strategy details" title="Every address, fee and source.">
          <p>Contract addresses come from StockYield&apos;s configuration and the asset and decimals are checked on-chain each time the page loads. Metrics come from the Morpho API; balances are read on-chain.</p>
        </SectionHead>
        <div className="mt-10 max-w-3xl"><StrategyDetailsContent /></div>
      </section>
    </>
  );
}
