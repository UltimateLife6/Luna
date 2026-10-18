import { Menu } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { primaryNav } from "@/lib/navigation";

export function SiteHeaderFallback() {
  return (
    <header className="border-b border-ivory/10 bg-obsidian">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" className="block min-w-0 leading-none" aria-label="Luna Fae Leathers, home">
          <span className="block font-display text-sm tracking-[0.28em] text-ivory">LUNA FAE</span>
          <span className="mt-1 block font-display text-[0.62rem] tracking-[0.38em] text-silver">LEATHERS</span>
        </Link>
        <nav className="hidden items-center gap-x-5 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-2 font-sans text-xs uppercase tracking-[0.16em] text-silver"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="inline-flex size-11 items-center justify-center text-ivory lg:hidden" aria-hidden="true">
          <Menu className="size-5" strokeWidth={1.5} />
        </span>
      </Container>
    </header>
  );
}
