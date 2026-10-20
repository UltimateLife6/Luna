import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { primaryNav, utilityNav } from "@/lib/navigation";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ivory/10 bg-obsidian">
      <Container className="grid gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:items-start lg:py-14">
        <div className="lg:col-span-4">
          <p className="font-display text-sm tracking-[0.28em] text-ivory">LUNA FAE</p>
          <p className="mt-2 font-display text-[0.62rem] tracking-[0.38em] text-silver">LEATHERS</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-silver">{site.disclosure}</p>
          <p className="mt-4 text-xs tracking-wide text-silver">{site.credit}</p>
        </div>
        <nav className="lg:col-span-3" aria-label="Footer">
          <p className="eyebrow">Explore</p>
          <ul className="mt-4 space-y-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-sm text-ivory hover:text-silver">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="lg:col-span-3" aria-label="Customer service">
          <p className="eyebrow">Customer service</p>
          <ul className="mt-4 space-y-1">
            {utilityNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-sm text-ivory hover:text-silver">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-2">
          <p className="eyebrow">The maker</p>
          <ul className="mt-4 space-y-1">
            <li>
              <ExternalAnchor href={site.instagramUrl} className="min-h-11">
                Instagram
              </ExternalAnchor>
            </li>
            <li>
              <ExternalAnchor href={site.etsyUrl} className="min-h-11">
                Etsy
              </ExternalAnchor>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
