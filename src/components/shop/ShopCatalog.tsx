import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { products } from "@/data/products";
import { categories, categoryTitle, filterProducts, readShopFilters, shopPath, type ShopFilters } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

export async function ShopCatalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = readShopFilters(await searchParams);
  const matches = filterProducts(products, filters);
  const filtersActive = Boolean(filters.q || filters.rawCategory);

  return (
    <Container className="pb-16 sm:pb-24">
      <form action="/shop" method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {filters.rawCategory ? <input type="hidden" name="category" value={filters.rawCategory} /> : null}
        <div className="min-w-0 flex-1">
          <label htmlFor="catalog-search" className="eyebrow">
            Search
          </label>
          <input
            id="catalog-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            maxLength={80}
            placeholder="Collar, mask, harness…"
            autoComplete="off"
            className="mt-3 w-full min-h-12 border border-ivory/40 bg-obsidian px-4 text-base text-ivory outline-none placeholder:text-silver"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <nav aria-label="Product categories" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li className="max-w-full">
            <CategoryLink href={shopPath({ q: filters.q })} current={!filters.rawCategory}>
              All examples
            </CategoryLink>
          </li>
          {categories.map((category) => (
            <li key={category.slug} className="max-w-full">
              <CategoryLink href={shopPath({ category: category.slug, q: filters.q })} current={filters.category === category.slug}>
                {category.title}
              </CategoryLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 flex flex-col gap-3 border-t border-ivory/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="text-sm text-silver">
          Showing {matches.length} of {products.length} concept examples.
        </p>
        {filtersActive ? (
          <Link href="/shop" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
            Clear filters
          </Link>
        ) : null}
      </div>

      {matches.length === 0 ? <EmptyCatalog filters={filters} /> : <CatalogGrid matches={matches} />}

      <aside className="mt-16 border-t border-ivory/10 pt-10">
        <p className="eyebrow">Separate from these examples</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-silver">
          None of the cards above can be purchased. The link below opens the maker’s Etsy shop. It is not a checkout for the concept examples.
        </p>
        <p className="mt-5">
          <ExternalAnchor href={site.etsyUrl}>Luna Fae Leathers on Etsy</ExternalAnchor>
        </p>
      </aside>
    </Container>
  );
}

function CatalogGrid({ matches }: { matches: typeof products }) {
  return (
    <ul className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2">
      {matches.map((product) => (
        <li key={product.slug} className="min-w-0">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

function EmptyCatalog({ filters }: { filters: ShopFilters }) {
  const detail = filters.categoryIsUnknown
    ? "That category is not part of this demo."
    : filters.q && filters.category
      ? `No concept example in ${categoryTitle(filters.category)} matches “${filters.q}”.`
      : filters.q
        ? `No concept example matches “${filters.q}”.`
        : "No concept examples are in this view.";

  return (
    <div className="mt-12 border border-ivory/10 bg-oxblood px-6 py-12 sm:px-10">
      <p className="eyebrow text-ivory/80">No matches</p>
      <p className="mt-4 max-w-xl font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Nothing fits that search.</p>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ivory">{detail}</p>
      <div className="mt-8">
        <Button href="/shop" variant="secondary">
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function CategoryLink({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex max-w-full min-h-11 items-center border px-4 py-2 text-left text-[0.68rem] uppercase leading-snug tracking-[0.14em]",
        current ? "border-ivory text-ivory" : "border-ivory/25 text-silver hover:border-ivory/70 hover:text-ivory",
      )}
    >
      {children}
    </Link>
  );
}

export function ShopCatalogFallback() {
  return (
    <Container className="pb-16">
      <p role="status" className="text-sm text-silver">
        Loading the catalog.
      </p>
    </Container>
  );
}
