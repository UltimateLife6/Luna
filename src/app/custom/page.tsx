import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { PageIntro } from "@/components/ui/PageIntro";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { commissionNotes } from "@/lib/home";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata("Custom orders");
export const ensureStatic = "navigation";

export default function CustomOrdersPage() {
  const editorial = approvedPresentation(photoPlacements.custom);

  return (
    <article>
      <PageIntro
        eyebrow="Commissions"
        title="Custom creations."
        description="Pieces can be made with a choice of stitching, buckle color, and sizing."
      />
      <Container className="pb-16 sm:pb-24">
        {editorial ? (
          <div className="mb-16 max-w-xl">
            <DemoImage
              src={editorial.src}
              alt={editorial.alt}
              objectPosition={editorial.objectPosition}
              aspectClassName="aspect-square"
              sizes="(min-width: 768px) 36rem, 100vw"
            />
          </div>
        ) : (
          <div className="mb-16 max-w-xl">
            <DemoImage kicker="Photograph" label="Photograph coming soon." alt="Luna Fae Leathers." aspectClassName="aspect-square" sizes="(min-width: 768px) 36rem, 100vw" />
          </div>
        )}
        <ol className="grid gap-10 border-t border-ivory/10 pt-10 md:grid-cols-3">
          {commissionNotes.map((note, index) => (
            <li key={note.title}>
              <p className="eyebrow">0{index + 1}</p>
              <h2 className="mt-3 font-editorial text-3xl text-ivory">{note.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-silver">{note.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 border-t border-ivory/10 pt-10">
          <h2 className="font-editorial text-4xl text-ivory">Begin a piece.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-silver">
            Custom requests are taken through Instagram and the Etsy shop.
          </p>
          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={site.instagramUrl}>Instagram</Button>
            <ExternalAnchor href={site.etsyUrl}>Etsy shop</ExternalAnchor>
          </div>
        </div>
      </Container>
    </article>
  );
}
