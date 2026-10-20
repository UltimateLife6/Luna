import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { availabilityForVariants } from "@/lib/catalog-store/availability";
import { formatPriceRange } from "@/lib/catalog-store/money";
import { listCatalogProducts, listCategories } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Catalog records");

export default async function AdminProductsPage() {
  await requireCatalogAdmin();
  const products = await listCatalogProducts("admin");
  const categories = await listCategories();

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Admin</p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-3xl font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Catalog records</h1>
          <Button href="/admin/products/new">New record</Button>
        </div>
        <AdminSectionNav current="records" />
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-silver">
          Drafts and archived records stay off the public catalog. Published records show the price and inventory saved here.
        </p>
        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>

        {products.length === 0 ? (
          <p className="mt-12 text-base text-silver">No catalog records yet.</p>
        ) : (
          <ul className="mt-12 divide-y divide-ivory/10 border-y border-ivory/10">
            {products.map((product) => (
              <li key={product.id} className="py-6">
                <p className="eyebrow">{product.status}</p>
                <h2 className="mt-3 font-editorial text-3xl text-ivory">{product.name}</h2>
                <p className="mt-2 text-sm text-silver">
                  {product.categoryName} · {formatPriceRange(product.variants)} · {availabilityForVariants(product.madeToOrder, product.variants).text}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6">
                  <Link href={`/admin/products/${product.id}`} className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                    Edit
                  </Link>
                  {product.status === "published" ? (
                    <Link href={`/catalog/${product.slug}`} className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                      View public page
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-16 border-t border-ivory/10 pt-10" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="font-editorial text-4xl text-ivory">
            Categories
          </h2>
          <ul className="mt-6 space-y-2 text-sm text-silver">
            {categories.map((category) => (
              <li key={category.id}>
                {category.name} <span className="text-ivory/70">/{category.slug}</span>
              </li>
            ))}
          </ul>
          <CategoryForm />
        </section>
      </Container>
    </article>
  );
}
