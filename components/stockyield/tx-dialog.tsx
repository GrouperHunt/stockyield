import { Check, Clock3, ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TxStep } from "@/lib/yield-strategy";

export function TxDialog({ open, busy, step, hash, explorer, onOpenChange, onClose }: { open: boolean; busy: boolean; step: TxStep; hash: string | null; explorer: string; onOpenChange: (o: boolean) => void; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="rounded-[26px] bg-[#fcfdf9] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "done" ? "Transaction confirmed" : step === "pending" ? "Still pending" : "Confirm in your wallet"}</DialogTitle>
          <DialogDescription>{step === "approval" ? "Allow the vault to use the selected USDG." : step === "deposit" ? "Deposit USDG directly into Morpho." : step === "withdraw" ? "Return USDG to your wallet." : step === "pending" ? "Your transaction was sent but is not confirmed yet. It may still succeed. Check its status on the explorer before trying again — do not resend." : "Your position has been updated."}</DialogDescription>
        </DialogHeader>
        <div className="my-4 grid place-items-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[#e6f4e9] text-[#21643f]">{step === "done" ? <Check size={36} /> : step === "pending" ? <Clock3 size={32} /> : <LoaderCircle size={32} className="animate-spin" />}</span>
        </div>
        {hash && <a href={`${explorer}/tx/${hash}`} target="_blank" className="flex justify-center gap-2 text-sm font-medium text-[#21643f]">View transaction <ExternalLink size={14} /></a>}
        {(step === "done" || step === "pending") && <Button onClick={onClose} className="mt-3 w-full">{step === "done" ? "Done" : "Close and refresh position"}</Button>}
      </DialogContent>
    </Dialog>
  );
}
