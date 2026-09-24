import { Reveal } from "./motion";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-14 md:px-8 md:pt-20">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h2 mt-4 max-w-3xl">{title}</h1>
        {children && <p className="lead mt-5">{children}</p>}
      </Reveal>
    </div>
  );
}

export function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <div className="md:col-span-7">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2 mt-4">{title}</h2>
      </div>
      {children && <div className="text-ink-2 md:col-span-4 md:col-start-9 md:self-end">{children}</div>}
    </div>
  );
}
