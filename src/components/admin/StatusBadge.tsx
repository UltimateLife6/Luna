export function StatusBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex min-h-8 items-center border border-ivory/20 px-2 text-[0.68rem] uppercase tracking-[0.14em] text-ivory">
      {children}
    </span>
  );
}
