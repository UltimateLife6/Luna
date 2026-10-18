import Link from "next/link";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { shopPath } from "@/lib/catalog";
import { collections } from "@/lib/home";

export function FeaturedCollections() {
  return (
    <section aria-labelledby="home-collections-heading" className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 id="home-collections-heading" className="mt-4 max-w-xl font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
              Directions in leather.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-silver sm:text-base">
            Illustrative categories for browsing later. They are not a claim that these pieces are in stock.
          </p>
        </div>
        <ul className="mt-12 grid gap-12 md:grid-cols-12 md:items-start md:gap-x-6 md:gap-y-14">
          {collections.map((collection, index) => {
            const photo = approvedPresentation(photoPlacements.collections[index] ?? "");

            return (
              <li key={collection.title} className={collection.className}>
                <Link href={shopPath({ category: collection.category })} className="group block">
                  <DemoImage
                    decorative={!photo}
                    src={photo?.src}
                    objectPosition={photo?.objectPosition}
                    kicker={photo ? "Photograph" : "Concept imagery"}
                    label={collection.title}
                    alt={photo?.alt ?? ""}
                    aspectClassName={collection.aspectClassName}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-editorial text-3xl text-ivory sm:text-4xl">{collection.title}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-silver">{collection.note}</p>
                    </div>
                    <span className="eyebrow pt-2">{collection.index}</span>
                  </div>
                  <span className="mt-4 block h-px w-10 bg-burgundy transition-[width] group-hover:w-16" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
