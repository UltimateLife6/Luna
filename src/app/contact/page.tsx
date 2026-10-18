import { InquiryDemo } from "@/components/contact/InquiryDemo";
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
        title="A note, held on this page."
        description="The note below is a demonstration. It is not delivered. Instagram and Etsy are the public channels named for this concept. No email address or telephone number is listed, because none was supplied."
      />
      <Container className="grid gap-14 pb-16 sm:pb-24 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7">
          <InquiryDemo />
        </div>
        <aside className="min-w-0 border border-ivory/10 px-5 py-6 lg:sticky lg:top-32 lg:col-span-5">
          <p className="eyebrow">Official channels</p>
          <p className="mt-4 text-sm leading-relaxed text-silver">
            This demo does not forward messages. The maker’s public accounts are separate destinations.
          </p>
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
          <p className="mt-6 border-t border-ivory/10 pt-4 text-sm leading-relaxed text-silver">
            Shopping stays on Etsy. Nothing on this site takes payment or places an order.
          </p>
        </aside>
      </Container>
    </article>
  );
}
