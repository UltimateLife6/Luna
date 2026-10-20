import { Suspense } from "react";
import { CatalogListing } from "@/components/catalog/CatalogListing";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { listCatalogProducts, publishedAssetFinder } from "@/lib/data/records";
import { presentPublishedCard } from "@/lib/catalog-store/present";
import { pageMetadata } from "@/lib/metadata";
import { connection } from "next/server";

export const metadata = pageMetadata("Catalog");
export const ensureStatic = "shell";

export default function CatalogPage() {
  return (
    <article>
      <PageIntro
        eyebrow="Catalog"
        title="Published pieces."
        description="Pieces appear here after they are published. Quote-only records stay outside checkout."
      />
      <Container>
        <Suspense fallback={<p className="pb-20 text-sm text-silver">Loading the catalog.</p>}>
          <PublishedCatalog />
        </Suspense>
      </Container>
    </article>
  );
}

async function PublishedCatalog() {
  await connection();
  const findAsset = await publishedAssetFinder();
  const products = (await listCatalogProducts("public")).flatMap((product) => {
    const card = presentPublishedCard(product, findAsset);
    return card ? [card] : [];
  });

  return <CatalogListing products={products} />;
}
