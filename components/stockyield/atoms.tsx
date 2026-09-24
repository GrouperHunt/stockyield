import { Check } from "lucide-react";

export function Metric({ l, v, green = false }: { l: string; v: string; green?: boolean }) {
  return <div className="p-5 md:p-6"><p className="text-xs uppercase tracking-[.1em] text-[#718078]">{l}</p><p className={`mt-2 text-2xl font-semibold ${green ? "text-[#218b4e]" : ""}`}>{v}</p></div>;
}
export function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-white/55">{l}</span><b className="text-right font-medium">{v}</b></div>;
}
export function CheckLine({ t }: { t: string }) {
  return <div className="flex items-center gap-3"><i className="grid h-6 w-6 place-items-center rounded-full bg-[#e6f4e9] text-[#21643f]"><Check size={14} /></i>{t}</div>;
}
export function PositionStat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-2xl bg-[#f0f2eb] p-5"><p className="text-sm text-[#718078]">{l}</p><p className="mt-2 text-xl font-semibold">{v}</p></div>;
}
export function Detail({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between py-3.5 text-sm"><span className="text-[#718078]">{l}</span><b>{v}</b></div>;
}
export function Risk({ i, t, d }: { i: React.ReactNode; t: string; d: string }) {
  return <div className="flex gap-4 rounded-2xl border bg-white p-4"><span className="mt-1 text-[#21643f] [&>svg]:h-5 [&>svg]:w-5">{i}</span><div><p className="font-medium">{t}</p><p className="mt-1 text-sm leading-6 text-[#657168]">{d}</p></div></div>;
}
