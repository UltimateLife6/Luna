import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { primaryNav, utilityNav } from "@/lib/navigation";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ivory/10 bg-obsidian">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-6">
          <p className="font-display text-sm tracking-[0.28em] text-ivory">LUNA FAE</p>
          <p className="mt-2 font-display text-[0.62rem] tracking-[0.38em] text-silver">LEATHERS</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-silver">{site.disclosure}</p>
          <p className="mt-6 text-xs tracking-wide text-silver">{site.credit}</p>
        </div>
        <nav className="lg:col-span-3" aria-label="Footer">
          <p className="eyebrow">Explore</p>
          <ul className="mt-5 space-y-3">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ivory hover:text-silver">
                  {item.label}
                </Link>
              </li>
            ))}
            {utilityNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-sm text-ivory hover:text-silver">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-3">
          <p className="eyebrow">The maker</p>
          <ul className="mt-5 space-y-3">
            <li>
              <ExternalAnchor href={site.instagramUrl}>Instagram</ExternalAnchor>
            </li>
            <li>
              <ExternalAnchor href={site.etsyUrl}>Etsy</ExternalAnchor>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
