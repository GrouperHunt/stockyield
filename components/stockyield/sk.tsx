// Loading placeholder: an empty shimmering block. It never contains digits, so a
// loading value can't be mistaken for a zero.
export function Sk({ className = "w-16" }: { className?: string }) {
  return <span role="status" aria-label="Loading" className={`skeleton inline-block h-[0.85em] align-middle ${className}`} />;
}
