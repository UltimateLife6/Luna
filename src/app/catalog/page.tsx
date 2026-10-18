import { Suspense } from "react";
import { CatalogListing } from "@/components/catalog/CatalogListing";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { listCatalogProducts, publishedAssetFinder } from "@/lib/data/records";
import { presentPublishedCard } from "@/lib/catalog-store/present";
import { pageMetadata } from "@/lib/metadata";
import { connection } from "next/server";

export const metadata = pageMetadata("Local catalog");
export const ensureStatic = "shell";

export default function CatalogPage() {
  return (
    <article>
      <PageIntro
        eyebrow="Local catalog"
        title="Published records from the local database."
        description="Only products saved as published are listed. Drafts, archived records, and the fictional shop examples are not inventory. Quote-only records stay outside checkout."
      />
      <Container>
        <Suspense fallback={<p className="pb-20 text-sm text-silver">Loading the local catalog.</p>}>
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
