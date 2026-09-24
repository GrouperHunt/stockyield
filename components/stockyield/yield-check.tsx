import { Check, Clock3, Info, ShieldCheck } from "lucide-react";

export function YieldCheck({ connected, data, gas, amount, gatesOpen, network }: { connected: boolean; data: boolean; gas: boolean; amount: boolean; gatesOpen: boolean | null; network: boolean }) {
  const gatesOk = gatesOpen !== false;
  const ready = connected && data && gas && amount && gatesOk && network;
  return (
    <div className="rounded-[18px] border border-white/12 bg-[#0f3021] p-4">
      <div className="flex justify-between">
        <span className="flex items-center gap-2 font-medium"><ShieldCheck size={17} />Yield Check</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-[#b7f24a] text-[#173f2c]" : "bg-white/10 text-white/65"}`}>{ready ? "Ready" : connected ? "Check details" : "Wallet needed"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55">
        <span className="flex gap-1">{data ? <Check size={13} /> : <Info size={13} />}Live vault data</span>
        <span className="flex gap-1">{network ? <Check size={13} /> : <Info size={13} />}Robinhood Chain</span>
        <span className="flex gap-1">{amount ? <Check size={13} /> : <Info size={13} />}Amount within balance</span>
        <span className="flex gap-1">{gatesOk ? <Check size={13} /> : <Info size={13} />}{gatesOpen === null ? "Gate status unknown" : "No allowlist gate active"}</span>
        <span className="flex gap-1">{gas ? <Check size={13} /> : <Info size={13} />}ETH for gas</span>
        <span className="flex gap-1"><Clock3 size={13} />APY is variable</span>
      </div>
    </div>
  );
}
