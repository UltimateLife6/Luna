import { MediaTools } from "@/components/admin/MediaTools";
import { ProductForm } from "@/components/admin/ProductForm";
import { Container } from "@/components/ui/Container";
import { catalogAssetChoices } from "@/lib/catalog-store/assets";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { listCategories, mediaChoices } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("New catalog record");

export default async function NewCatalogProductPage() {
  await requireCatalogAdmin();
  const categories = await listCategories();
  const uploads = await mediaChoices();

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Local only</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">New record</h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-silver">
          Save a draft until the name, price, and inventory are confirmed. Publishing makes the record visible on the local catalog. Checkout also requires the purchase mode to be checkout, a test Stripe key, and a saved shipping rate.
        </p>
        <div className="mt-10">
          <MediaTools returnTo="/admin/products/new" uploads={uploads} />
          <ProductForm categories={categories} assets={[...catalogAssetChoices(), ...uploads]} />
        </div>
      </Container>
    </article>
  );
}
