import Link from "next/link";
import { DemoImage } from "@/components/ui/DemoImage";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import type { PublicCatalogCard } from "@/lib/catalog-store/present";
import { site } from "@/lib/site";

export function CatalogListing({ products }: { products: PublicCatalogCard[] }) {
  if (products.length === 0) {
    return (
      <div className="pb-20">
        <p className="max-w-xl text-base leading-relaxed text-silver">No pieces are published yet.</p>
        <p className="mt-4">
          <ExternalAnchor href={site.etsyUrl}>Current listings on Etsy</ExternalAnchor>
        </p>
      </div>
    );
  }

  const groups = groupByCategory(products);

  return (
    <div className="space-y-16 pb-20">
      {groups.map((group) => (
        <section key={group.categoryName} aria-labelledby={`catalog-${slugify(group.categoryName)}`}>
          <h2 id={`catalog-${slugify(group.categoryName)}`} className="font-editorial text-4xl text-ivory sm:text-5xl">
            {group.categoryName}
          </h2>
          <ul className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2">
            {group.products.map((product) => (
              <li key={product.slug} className="min-w-0">
                <CatalogCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CatalogCard({ product }: { product: PublicCatalogCard }) {
  return (
    <article className="min-w-0">
      <Link href={`/catalog/${product.slug}`} className="group block">
        <DemoImage
          decorative
          src={product.image?.src}
          kicker="Photograph"
          label={product.image?.label ?? "No photograph is marked as this product."}
          alt=""
          objectPosition={product.image?.objectPosition}
          aspectClassName="aspect-[4/5]"
          sizes="(min-width: 640px) 45vw, 100vw"
        />
        <p className="mt-5 eyebrow">{product.categoryName}</p>
        <h3 className="mt-3 font-editorial text-3xl leading-tight text-ivory sm:text-4xl">{product.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-ivory">{product.priceLabel}</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-silver">{product.availabilityLabel}</p>
        <span className="mt-5 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">View details</span>
        <span className="block h-px w-10 bg-burgundy transition-[width] group-hover:w-16 group-focus-visible:w-16" aria-hidden="true" />
      </Link>
    </article>
  );
}

function groupByCategory(products: PublicCatalogCard[]): { categoryName: string; products: PublicCatalogCard[] }[] {
  const groups: { categoryName: string; products: PublicCatalogCard[] }[] = [];

  for (const product of products) {
    const current = groups[groups.length - 1];

    if (current?.categoryName === product.categoryName) {
      current.products.push(product);
    } else {
      groups.push({ categoryName: product.categoryName, products: [product] });
    }
  }

  return groups;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
