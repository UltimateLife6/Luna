import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomizationDemo } from "@/components/shop/CustomizationDemo";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { PurchaseState } from "@/components/shop/PurchaseState";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getProduct, getRelatedProducts, products } from "@/data/products";
import { categoryTitle, shopPath } from "@/lib/catalog";
import { approvedPublicPath } from "@/data/image-assets";
import { creationTypeForCategory } from "@/lib/commission";
import { demoRobots, pageMetadata } from "@/lib/metadata";
import type { Product } from "@/types/catalog";

type ProductRouteProps = PageProps<"/shop/[slug]">;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

/**
 * Unknown slugs 404 at the router, before partial prerendering can commit a 200 shell.
 * `dynamicParams` cannot be set while cache components are enabled.
 */
export const unstable_paramMatching = {
  slug: "not-found",
};

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    return pageMetadata("Not in the catalog");
  }

  return {
    title: product.name,
    description: product.summary,
    robots: demoRobots,
  };
}

export default async function ProductDetailPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  return <ProductRecord product={product} related={getRelatedProducts(product.slug)} />;
}

function ProductRecord({ product, related }: { product: Product; related: Product[] }) {
  const imageNote = product.images.some((image) => approvedPublicPath(image.src))
    ? "Includes an approved photograph."
    : "Concept placeholders. Not approved photography.";

  return (
    <article className="py-12 sm:py-16">
      <Container>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-silver">
            <li>
              <Link href="/shop" className="inline-flex min-h-11 items-center text-ivory">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={shopPath({ category: product.category })} className="inline-flex min-h-11 items-center text-ivory">
                {categoryTitle(product.category)}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-silver" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery name={product.name} images={product.images} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <p className="eyebrow">Concept example</p>
            <h1 className="mt-4 text-balance font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">{product.name}</h1>
            <p className="mt-4 text-sm text-silver">{categoryTitle(product.category)}</p>
            <p className="mt-6 text-base leading-relaxed text-ivory">{product.summary}</p>
            <p className="mt-4 text-sm leading-relaxed text-silver">{product.description}</p>

            <dl className="mt-8 space-y-4 border-t border-ivory/10 pt-6 text-sm">
              <div>
                <dt className="eyebrow">Record</dt>
                <dd className="mt-2 text-ivory">{product.status === "verified" ? "Verified" : "Demo"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Attribution</dt>
                <dd className="mt-2 leading-relaxed text-ivory">
                  {product.attribution === "verified-listing"
                    ? "Verified listing."
                    : "Fictional interface example. Not a Luna Fae Leathers product."}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Imagery</dt>
                <dd className="mt-2 leading-relaxed text-ivory">{imageNote}</dd>
              </div>
            </dl>

            <div className="mt-10">
              {product.customization?.length ? (
                <CustomizationDemo groups={product.customization} />
              ) : (
                <p className="text-sm leading-relaxed text-silver">No example options are shown for this record.</p>
              )}
            </div>

            {product.sizingNotes ? (
              <div className="mt-10">
                <h2 className="font-editorial text-3xl text-ivory">Sizing</h2>
                <p className="mt-3 text-sm leading-relaxed text-silver">{product.sizingNotes}</p>
              </div>
            ) : null}

            <div className="mt-10">
              <PurchaseState etsyUrl={product.etsyUrl} />
            </div>

            <div className="mt-8 border-t border-ivory/10 pt-6">
              <p className="eyebrow">A similar concept</p>
              <p className="mt-3 text-sm leading-relaxed text-silver">
                This fictional example is not available to commission. The builder can open with “{categoryTitle(product.category)}” mapped to an example type. That does not make this card orderable.
              </p>
              <div className="mt-5">
                <Button href={`/custom?type=${creationTypeForCategory(product.category)}`} variant="secondary">
                  Open the commission example
                </Button>
              </div>
            </div>

            <div className="mt-8">
              <Button href="/shop" variant="secondary">
                Back to the shop
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="related-examples-heading" className="mt-20 border-t border-ivory/10 pt-14">
          <p className="eyebrow">Same category</p>
          <h2 id="related-examples-heading" className="mt-4 font-editorial text-4xl text-ivory sm:text-5xl">
            Related examples
          </h2>
          {related.length === 0 ? (
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-silver">No other concept example shares this category.</p>
          ) : (
            <ul className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug} className="min-w-0">
                  <ProductCard product={item} headingLevel={3} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </article>
  );
}
