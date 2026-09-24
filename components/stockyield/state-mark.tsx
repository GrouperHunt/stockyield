import { Check, X } from "lucide-react";

export type CheckState = "passed" | "failed" | "unavailable" | "checking";

// Three real states + "checking". Meaning never relies on color alone: each has
// its own shape (filled square with ✓ / filled square with ✕ / dashed square with –)
// and always a word.
export function StateMark({ state, label }: { state: CheckState; label?: string }) {
  const word = label ?? { passed: "Passed", failed: "Failed", unavailable: "Unavailable", checking: "Checking…" }[state];
  if (state === "checking") {
    return <span key={state} className="sweep inline-flex items-center gap-2 text-xs text-ink-2"><span className="skeleton h-4 w-4" aria-hidden />{word}</span>;
  }
  const box =
    state === "passed" ? "bg-signal-ink text-white" : state === "failed" ? "bg-danger text-white" : "border border-dashed border-ink-2 text-ink-2";
  const text = state === "passed" ? "text-signal-ink" : state === "failed" ? "text-danger" : "text-ink-2";
  return (
    <span key={state} className={`sweep inline-flex items-center gap-2 text-xs font-medium ${text}`}>
      <span className={`grid h-4 w-4 shrink-0 place-items-center ${box}`} aria-hidden>
        {state === "passed" ? <Check size={11} strokeWidth={3} /> : state === "failed" ? <X size={11} strokeWidth={3} /> : <span className="leading-none">–</span>}
      </span>
      {word}
    </span>
  );
}
