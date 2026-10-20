import { Menu } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/layout/Wordmark";
import { Container } from "@/components/ui/Container";
import { primaryNav } from "@/lib/navigation";

export function SiteHeaderFallback() {
  return (
    <header className="border-b border-ivory/10 bg-obsidian">
      <Container className="flex h-[4.75rem] items-center justify-between gap-4">
        <Wordmark />
        <nav className="hidden items-center lg:flex" aria-label="Primary">
          <ul className="flex items-center gap-x-5 xl:gap-x-7">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center font-sans text-[0.68rem] uppercase tracking-[0.18em] text-silver">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <span className="inline-flex size-11 items-center justify-center text-ivory lg:hidden" aria-hidden="true">
          <Menu className="size-5" strokeWidth={1.5} />
        </span>
      </Container>
    </header>
  );
}
