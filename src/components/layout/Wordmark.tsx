import Link from "next/link";

export function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="block min-w-0 leading-none" aria-label="Luna Fae Leathers, home" onClick={onNavigate}>
      <span className="block font-display text-[0.92rem] tracking-[0.2em] text-ivory sm:text-base sm:tracking-[0.28em]">LUNA FAE</span>
      <span className="mt-1.5 block font-display text-[0.62rem] tracking-[0.32em] text-silver sm:tracking-[0.42em]">LEATHERS</span>
    </Link>
  );
}
