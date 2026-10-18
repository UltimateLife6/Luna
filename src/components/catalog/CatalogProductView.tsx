import Link from "next/link";
import { ProductConfigurator } from "@/components/catalog/ProductConfigurator";
import { QuoteRequestForm } from "@/components/catalog/QuoteRequestForm";
import { DemoImage } from "@/components/ui/DemoImage";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { PublicCatalogCard, PublicCatalogProduct } from "@/lib/catalog-store/present";
import type { ConfigurationInput } from "@/lib/commerce/selection";

export function CatalogProductView({
  product,
  related,
  saved,
}: {
  product: PublicCatalogProduct;
  related: PublicCatalogCard[];
  saved?: { variantId: string; configuration: ConfigurationInput } | null;
}) {
  const lead = product.images.find((image) => image.depictsProduct);
  const frames = product.images.length > 0 ? product.images : [emptyFrame(product.name)];

  return (
    <article className="py-12 sm:py-16">
      <Container>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-silver">
            <li>
              <Link href="/catalog" className="inline-flex min-h-11 items-center text-ivory">
                Local catalog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="inline-flex min-h-11 items-center">{product.categoryName}</span>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-silver" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 space-y-8 lg:col-span-7">
            {frames.map((image) => (
              <figure key={image.assetId} className="min-w-0">
                <DemoImage
                  src={image.src}
                  alt={image.alt}
                  kicker={image.src ? "Photograph not published" : "No photograph"}
                  label={image.label}
                  objectPosition={image.objectPosition}
                  aspectClassName="aspect-[4/5]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                <figcaption className="mt-4 max-w-xl text-sm leading-relaxed text-silver">{image.caption}</figcaption>
              </figure>
            ))}
          </div>
          <div className="min-w-0 lg:col-span-5">
            <p className="eyebrow">Local catalog</p>
            <h1 className="mt-4 text-balance font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">{product.name}</h1>
            <p className="mt-4 text-sm text-silver">{product.categoryName}</p>
            <p className="mt-6 font-editorial text-4xl text-ivory">{product.priceLabel}</p>
            <p className="mt-4 text-base leading-relaxed text-ivory">{product.summary}</p>
            <p className="mt-4 text-sm leading-relaxed text-silver">{product.description}</p>

            <dl className="mt-8 space-y-4 border-t border-ivory/10 pt-6 text-sm">
              <div>
                <dt className="eyebrow">Availability</dt>
                <dd className="mt-2 leading-relaxed text-ivory">{product.availabilityLabel}</dd>
              </div>
              <div>
                <dt className="eyebrow">Made to order</dt>
                <dd className="mt-2 leading-relaxed text-ivory">{product.madeToOrder ? "Yes" : "No"}</dd>
              </div>
              {product.madeToOrderNote ? (
                <div>
                  <dt className="eyebrow">Note stored with this record</dt>
                  <dd className="mt-2 leading-relaxed text-ivory">{product.madeToOrderNote}</dd>
                </div>
              ) : null}
              <div>
                <dt className="eyebrow">Purchase</dt>
                <dd className="mt-2 leading-relaxed text-ivory">
                  {product.purchaseMode === "checkout"
                    ? "This record can be added to the cart. The estimate updates as you choose saved options. Checkout stays off until Stripe test mode and a shipping rate are configured."
                    : "This record is quote-only. A request is saved for review and is not charged. No price or production date is set until the maker confirms it."}
                </dd>
              </div>
              {lead ? null : (
                <div>
                  <dt className="eyebrow">Photograph</dt>
                  <dd className="mt-2 leading-relaxed text-ivory">No photograph is marked as depicting this product.</dd>
                </div>
              )}
            </dl>

            <div className="mt-10">
              <h2 className="font-editorial text-3xl text-ivory">Variants</h2>
              <ul className="mt-5 divide-y divide-ivory/10 border-y border-ivory/10">
                {product.variants.map((variant) => (
                  <li key={variant.id} className="py-4">
                    <p className="text-ivory">{variant.label}</p>
                    <p className="mt-1 text-sm text-ivory">{variant.priceLabel}</p>
                    <p className="mt-1 text-sm text-silver">{variant.availabilityLabel}</p>
                    <p className="mt-1 text-sm text-silver">{variant.skuLabel}</p>
                  </li>
                ))}
              </ul>
            </div>

            {product.purchaseMode === "checkout" ? (
              <ProductConfigurator product={product} saved={saved} />
            ) : (
              <QuoteRequestForm productId={product.id} productName={product.name} />
            )}
            <div className="mt-8">
              <Button href="/catalog" variant="secondary">
                Back to the local catalog
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="related-catalog-heading" className="mt-20 border-t border-ivory/10 pt-14">
          <p className="eyebrow">Same category</p>
          <h2 id="related-catalog-heading" className="mt-4 font-editorial text-4xl text-ivory sm:text-5xl">
            Other published records
          </h2>
          {related.length === 0 ? (
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-silver">No other published product is in this category.</p>
          ) : (
            <ul className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link href={`/catalog/${item.slug}`} className="group block">
                    <p className="eyebrow">{item.categoryName}</p>
                    <p className="mt-3 font-editorial text-3xl text-ivory">{item.name}</p>
                    <p className="mt-3 text-sm text-ivory">{item.priceLabel}</p>
                    <p className="mt-2 text-sm text-silver">{item.availabilityLabel}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </article>
  );
}

function emptyFrame(name: string) {
  return {
    assetId: "none",
    src: undefined,
    alt: `${name} has no photograph attached.`,
    label: "No photograph is attached.",
    objectPosition: "center",
    caption: "No photograph is attached to this record.",
    depictsProduct: false,
  };
}
