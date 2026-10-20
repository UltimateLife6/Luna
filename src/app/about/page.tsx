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
        title="Made by hand."
        description="Luna Fae Leathers makes custom handcrafted leather accessories and apparel."
      />
      <Container className="pb-16 sm:pb-24">
        <section className="grid items-center gap-12 border-t border-ivory/10 pt-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow">Craft</p>
            <h2 className="mt-4 font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Made by hand.</h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-silver">
              The pieces are handcrafted for personal expression. The work includes harnesses, masks, collars, leather accessories, and fantasy armor, along with markets, conventions, and collaborations.
            </p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <DemoImage
              kicker="Photograph"
              label="Photograph coming soon."
              alt="Luna Fae Leathers."
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
                kicker="Photograph"
                label={materials ? "Worn harness" : "Photograph coming soon."}
                alt={materials?.alt ?? "Luna Fae Leathers."}
                aspectClassName="aspect-[4/3]"
                sizes="(min-width: 1024px) 36vw, 100vw"
              />
            </div>
            <div className="grid gap-10 lg:col-span-6 lg:col-start-7">
              <article>
                <h3 className="font-editorial text-3xl text-ivory">Vegetable-tanned leather</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  The leather is 100% vegetable-tanned.
                </p>
              </article>
              <article>
                <h3 className="font-editorial text-3xl text-ivory">Custom details</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">Stitching, buckle color, and sizing are part of a custom piece.</p>
              </article>
              <article>
                <h3 className="font-editorial text-3xl text-ivory">Where to find the work</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  Markets, conventions, and collaborations are part of the practice. Confirmed dates are listed with appearances.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-ivory/10 pt-12">
          <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Continue from here.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-silver">
            Custom pieces and current listings are a short step from here.
          </p>
          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Button href="/custom">Custom creations</Button>
            <Button href={site.etsyUrl} variant="secondary">
              Etsy shop
            </Button>
          </div>
        </section>
      </Container>
    </article>
  );
}
