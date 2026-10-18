import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { PageIntro } from "@/components/ui/PageIntro";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata("About");
export const ensureStatic = "navigation";

export default function AboutPage() {
  const materials = approvedPresentation(photoPlacements.aboutMaterials);

  return (
    <article>
      <PageIntro
        eyebrow="The maker"
        title="The work, as it is publicly described."
        description="Luna Fae Leathers is an independent artisan brand making custom handcrafted leather accessories and apparel. This page stays inside that public description."
      />
      <Container className="pb-16 sm:pb-24">
        <section className="grid items-center gap-12 border-t border-ivory/10 pt-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow">Craft</p>
            <h2 className="mt-4 font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Made by hand.</h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-silver">
              The public description presents the pieces as handcrafted, and as made for personal expression. A longer philosophy, a founding year, and a personal history are not published here.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-silver">
              {materials
                ? "Photographs on this page show people wearing leather. They are not identified as the maker, and they are not attached to a named product."
                : "Work shown publicly includes harnesses, masks, collars, leather accessories, and fantasy armor, along with markets, conventions, and collaborations. Those pieces are not pictured in this demo."}
            </p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <DemoImage
              kicker="Concept imagery"
              label="Making frame"
              alt="Concept frame reserved for a photograph of the making. No Luna Fae piece is shown."
              aspectClassName="aspect-[4/5]"
              sizes="(min-width: 1024px) 36vw, 100vw"
            />
          </div>
        </section>

        <section className="mt-20 border-t border-ivory/10 pt-12">
          <p className="eyebrow">Materials</p>
          <h2 className="mt-4 max-w-2xl font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Leather, stitching, and fit.</h2>
          <div className="mt-10 grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <DemoImage
                src={materials?.src}
                objectPosition={materials?.objectPosition}
                kicker={materials ? "Photograph" : "Concept imagery"}
                label={materials ? "Worn harness" : "Materials frame"}
                alt={materials?.alt ?? "Concept frame reserved for a material photograph. No Luna Fae piece is shown."}
                aspectClassName="aspect-[4/3]"
                sizes="(min-width: 1024px) 36vw, 100vw"
              />
            </div>
            <div className="grid gap-10 lg:col-span-6 lg:col-start-7">
              <article>
                <h3 className="font-editorial text-3xl text-ivory">Vegetable-tanned leather</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  The Instagram bio describes the leather as 100% vegetable-tanned. No further material claims, and no sustainability certification, are added here.
                </p>
              </article>
              <article>
                <h3 className="font-editorial text-3xl text-ivory">What can be customized</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  Stitching, buckle color, and sizing are the customizations described publicly. The commission page demonstrates how those choices could be gathered. It does not submit a request.
                </p>
              </article>
              <article>
                <h3 className="font-editorial text-3xl text-ivory">What is left unstated</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  Production capacity, customer counts, awards, processing times, and business policies are omitted until the maker supplies them.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-ivory/10 pt-12">
          <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Continue from here.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-silver">
            The commission builder is a demonstration. The Etsy shop is the maker’s existing storefront, separate from this concept.
          </p>
          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Button href="/custom">Open the commission example</Button>
            <Button href={site.etsyUrl} variant="secondary">
              Etsy shop
            </Button>
          </div>
        </section>
      </Container>
    </article>
  );
}
