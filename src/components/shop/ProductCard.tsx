import Link from "next/link";
import { DemoImage } from "@/components/ui/DemoImage";
import { categoryTitle, customizationIndicator } from "@/lib/catalog";
import type { Product } from "@/types/catalog";

type ProductCardProps = {
  product: Product;
  headingLevel?: 2 | 3;
};

export function ProductCard({ product, headingLevel = 2 }: ProductCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const image = product.images[0];
  const options = customizationIndicator(product);

  return (
    <article className="min-w-0">
      <Link href={`/shop/${product.slug}`} className="group block">
        <DemoImage
          decorative
          src={image?.src}
          kicker="Photograph"
          label={image?.label ?? product.name}
          alt=""
          aspectClassName="aspect-[4/5]"
          sizes="(min-width: 640px) 45vw, 100vw"
        />
        <p className="mt-5 eyebrow">{categoryTitle(product.category)}</p>
        <Heading className="mt-3 font-editorial text-3xl leading-tight text-ivory sm:text-4xl">{product.name}</Heading>
        <p className="mt-3 text-sm leading-relaxed text-silver">
          {product.summary}
        </p>
        {options ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-ivory">{options}</p> : null}
        <span className="mt-5 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">View details</span>
        <span className="block h-px w-10 bg-burgundy transition-[width] group-hover:w-16 group-focus-visible:w-16" aria-hidden="true" />
      </Link>
    </article>
  );
}
