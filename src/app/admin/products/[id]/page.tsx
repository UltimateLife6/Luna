import { notFound } from "next/navigation";
import { MediaTools } from "@/components/admin/MediaTools";
import { DeleteProductForm, ProductForm } from "@/components/admin/ProductForm";
import { Container } from "@/components/ui/Container";
import { catalogAssetChoices } from "@/lib/catalog-store/assets";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { getCatalogProduct, listCategories, mediaChoices } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

type EditCatalogProductPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = pageMetadata("Edit catalog record");

export default async function EditCatalogProductPage({ params }: EditCatalogProductPageProps) {
  await requireCatalogAdmin();
  const { id } = await params;
  const product = await getCatalogProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Edit record</h1>
        <p className="mt-6 max-w-2xl text-sm text-silver">{product.name}</p>
        <div className="mt-10">
          <MediaTools returnTo={`/admin/products/${product.id}`} uploads={await mediaChoices()} />
          <ProductForm product={product} categories={await listCategories()} assets={[...catalogAssetChoices(), ...(await mediaChoices())]} />
          <DeleteProductForm productId={product.id} />
        </div>
      </Container>
    </article>
  );
}
