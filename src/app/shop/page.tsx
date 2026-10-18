import Link from "next/link";
import { Suspense } from "react";
import { ShopCatalog, ShopCatalogFallback } from "@/components/shop/ShopCatalog";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Shop");
export const ensureStatic = "shell";

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <article>
      <PageIntro
        eyebrow="Catalog"
        title="Concept pieces, arranged for browsing."
        description="Eight fictional examples stand in for a future catalog. They are not Luna Fae Leathers designs, and none of them can be purchased here."
      />
      <Container className="-mt-8 pb-2 sm:-mt-12">
        <p className="max-w-2xl text-sm leading-relaxed text-silver">
          Published database records are listed in the{" "}
          <Link href="/catalog" className="text-ivory underline decoration-burgundy underline-offset-4">
            local catalog
          </Link>
          . They are not mixed into the examples below.
        </p>
      </Container>
      <Suspense fallback={<ShopCatalogFallback />}>
        <ShopCatalog searchParams={searchParams} />
      </Suspense>
    </article>
  );
}
