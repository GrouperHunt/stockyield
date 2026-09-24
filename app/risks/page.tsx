import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DISCLAIMER, FAQ, NON_AFFILIATION, RISKS } from "@/lib/content";

export const metadata: Metadata = { title: "Risks & FAQ", description: "The risks of depositing USDG in the Steakhouse USDG vault on Morpho, and answers to common questions." };

export default function RisksPage() {
  return (
    <>
      <PageHeader eyebrow="04 · Risks & FAQ" title="What can go wrong, and what to know first.">
        Depositing is not risk-free. These are the main ways you can lose money or be unable to withdraw, in plain language.
      </PageHeader>

      <section className="mx-auto max-w-[1200px] px-4 md:px-8" aria-labelledby="risks-h">
        <h2 id="risks-h" className="sr-only">Risks</h2>
        <ol className="grid gap-px border bg-line md:grid-cols-2">
          {RISKS.map((r, i) => (
            <li key={r.id} className="bg-surface p-6 md:p-8">
              <Reveal>
                <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-xl font-medium tracking-tight">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{r.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="on-dark mt-16 bg-graphite text-bg">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-4 py-14 md:grid-cols-2 md:px-8">
          <p className="text-2xl font-medium leading-snug tracking-tight">{DISCLAIMER}</p>
          <p className="text-on-graphite-2">{NON_AFFILIATION}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pt-20 md:px-8" aria-labelledby="faq-h">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-h" className="h2 mt-4 max-w-3xl">Questions, answered briefly.</h2>
        <Accordion type="single" collapsible className="mt-10 border-y">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="py-5 text-left text-lg font-medium tracking-tight hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="max-w-3xl pb-5 text-base leading-relaxed text-ink-2">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
