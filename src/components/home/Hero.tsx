import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { Button } from "@/components/ui/Button";
import { DemoImage } from "@/components/ui/DemoImage";

export function Hero() {
  const hero = approvedPresentation(photoPlacements.hero);

  return (
    <section aria-labelledby="home-hero-heading" className="border-b border-ivory/10">
      <div className="grid grid-cols-1 lg:min-h-[calc(100svh-7.5rem)] lg:grid-cols-2">
        <div className="relative order-2 aspect-[4/3] min-w-0 sm:aspect-[16/10] lg:order-1 lg:aspect-auto lg:h-full">
          <DemoImage
            fill
            priority
            src={hero?.src}
            objectPosition={hero?.objectPosition}
            kicker={hero ? "Photograph" : "Concept imagery"}
            label={hero ? "Homepage photograph" : "Photograph not yet placed"}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt={hero?.alt ?? "Concept imagery for the Luna Fae Leathers homepage. No merchandise is shown."}
          />
        </div>
        <div className="order-1 flex min-w-0 flex-col justify-end px-5 py-14 sm:px-10 sm:py-20 lg:order-2 lg:px-14 lg:py-16 xl:px-16">
          <p className="eyebrow">Luna Fae Leathers</p>
          <h1
            id="home-hero-heading"
            className="mt-6 max-w-full text-balance font-editorial text-[2.5rem] leading-[0.92] text-ivory sm:text-6xl xl:text-7xl"
          >
            Crafted for the Unconventional.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ivory sm:text-lg">
            Handcrafted leather accessories and apparel, made for personal expression.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-silver sm:text-base">
            An unofficial boutique concept. The collection is not loaded, and nothing on this site is for sale.
          </p>
          <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Button href="/shop">Explore the Collection</Button>
            <Button href="/custom" variant="secondary">
              Custom Creations
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
