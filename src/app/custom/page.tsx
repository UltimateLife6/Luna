import { Suspense } from "react";
import { CommissionBuilder, CommissionBuilderFallback } from "@/components/custom/CommissionBuilder";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { PageIntro } from "@/components/ui/PageIntro";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Custom orders");
export const ensureStatic = "navigation";

export default function CustomOrdersPage() {
  const editorial = approvedPresentation(photoPlacements.custom);

  return (
    <article>
      <PageIntro
        eyebrow="Commissions"
        title="A commission, in concept."
        description="Walk through an example request. The choices are illustrative, not a menu Luna Fae Leathers has confirmed. Nothing on this page is submitted."
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
            <p className="mt-3 text-sm leading-relaxed text-silver">
              A supplied photograph of a person wearing a harness. This person is not identified as the maker, and this piece is not available to commission from this page.
            </p>
          </div>
        ) : null}
        <Suspense fallback={<CommissionBuilderFallback />}>
          <CommissionBuilder />
        </Suspense>
      </Container>
    </article>
  );
}
