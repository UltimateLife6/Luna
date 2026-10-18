import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CatalogProductView } from "@/components/catalog/CatalogProductView";
import { getPublishedBySlug, listRelatedPublished, publishedAssetFinder, readCart } from "@/lib/data/records";
import { presentPublishedCard, presentPublishedProduct } from "@/lib/catalog-store/present";
import { readCartId } from "@/lib/commerce/cart-cookie";
import { demoRobots, pageMetadata } from "@/lib/metadata";

type CatalogProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CatalogProductPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const product = await getPublishedBySlug(slug);

  if (!product) {
    return pageMetadata("Not in the local catalog");
  }

  return {
    title: product.name,
    description: product.summary,
    robots: demoRobots,
  };
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  await connection();
  const { slug } = await params;
  const findAsset = await publishedAssetFinder();
  const product = await getPublishedBySlug(slug);
  const view = product ? presentPublishedProduct(product, findAsset) : null;

  if (!product || !view) {
    notFound();
  }

  const related = (await listRelatedPublished(product)).flatMap((item) => {
    const card = presentPublishedCard(item, findAsset);
    return card ? [card] : [];
  });
  const cartId = await readCartId();
  const cart = cartId ? await readCart(cartId, new Date()) : null;
  const savedLine = cart?.lines.filter((line) => line.productSlug === product.slug && line.configuration).at(-1);

  return (
    <CatalogProductView
      product={view}
      related={related}
      saved={savedLine?.configuration ? { variantId: savedLine.variantId, configuration: savedLine.configuration } : null}
    />
  );
}
