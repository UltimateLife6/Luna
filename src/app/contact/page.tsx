import { Container } from "@/components/ui/Container";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { PageIntro } from "@/components/ui/PageIntro";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata("Contact");
export const ensureStatic = "navigation";

export default function ContactPage() {
  return (
    <article>
      <PageIntro
        eyebrow="Correspondence"
        title="Reach the studio."
        description="Instagram and Etsy are the places to write about a piece, a commission, or an appearance."
      />
      <Container className="grid gap-14 pb-16 sm:pb-24 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 border border-ivory/10 px-6 py-10 sm:px-10 lg:col-span-7">
          <p className="eyebrow">Write</p>
          <h2 className="mt-4 font-editorial text-4xl leading-tight text-ivory sm:text-5xl">A message finds the maker on Instagram or Etsy.</h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-silver">
            Custom stitching, buckle color, and sizing can be discussed there. The Etsy shop also holds current listings.
          </p>
        </div>
        <aside className="min-w-0 border border-ivory/10 px-5 py-6 lg:sticky lg:top-32 lg:col-span-5">
          <p className="eyebrow">Channels</p>
          <ul className="mt-6 space-y-4">
            <li>
              <p className="text-xs uppercase tracking-[0.16em] text-silver">Instagram</p>
              <ExternalAnchor href={site.instagramUrl} className="mt-2">
                lunafaeleathers
              </ExternalAnchor>
            </li>
            <li>
              <p className="text-xs uppercase tracking-[0.16em] text-silver">Etsy</p>
              <ExternalAnchor href={site.etsyUrl} className="mt-2">
                Luna Fae Leathers
              </ExternalAnchor>
            </li>
          </ul>
        </aside>
      </Container>
    </article>
  );
}
