import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { craftPoints } from "@/lib/home";

export function CraftedByHand() {
  const craft = approvedPresentation(photoPlacements.craft);

  return (
    <section aria-labelledby="home-craft-heading" className="border-t border-ivory/10 py-16 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow">The making</p>
          <h2 id="home-craft-heading" className="mt-4 font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
            Crafted by hand.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-silver sm:text-lg">
            Each piece is made by hand in vegetable-tanned leather.
          </p>
          <dl className="mt-10 border-l border-burgundy">
            {craftPoints.map((point) => (
              <div key={point.title} className="border-b border-ivory/10 py-5 pl-6 last:border-b-0">
                <dt className="font-editorial text-2xl text-ivory sm:text-3xl">{point.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-silver">{point.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <DemoImage
            src={craft?.src}
            objectPosition={craft?.objectPosition}
            kicker="Photograph"
            label={craft ? craft.label : "Photograph coming soon."}
            alt={craft?.alt ?? "Luna Fae Leathers."}
            aspectClassName="aspect-[4/5] sm:aspect-[5/6]"
            sizes="(min-width: 1024px) 42vw, 100vw"
          />
        </div>
      </Container>
    </section>
  );
}
