import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EIP6963ProviderDetail } from "@/lib/yield-strategy";
import type { EIP1193Provider } from "viem";

export function WalletPicker({ open, onOpenChange, wallets, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; wallets: EIP6963ProviderDetail[]; onPick: (p: EIP1193Provider) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[26px] bg-[#fcfdf9] sm:max-w-sm">
        <DialogHeader><DialogTitle>Choose a wallet</DialogTitle><DialogDescription>Multiple wallets were found in your browser.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {wallets.map((w) => (
            <button key={w.info.uuid} onClick={() => { onOpenChange(false); onPick(w.provider); }} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left hover:bg-[#f4f5ef]">
              {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are arbitrary data: URLs announced at runtime by each wallet extension, not a static/optimizable asset. */}
              {w.info.icon && <img src={w.info.icon} alt="" className="h-8 w-8 rounded-lg" />}
              <span className="font-medium">{w.info.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
