import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata("Custom orders");
export const ensureStatic = "navigation";

const personalization = [
  {
    title: "Stitching",
    body: "Choose stitching details that complement your piece.",
  },
  {
    title: "Hardware",
    body: "Select the buckle color and hardware finish that suit your design.",
  },
  {
    title: "Sizing",
    body: "Made with your measurements and intended fit in mind.",
  },
] as const;

const process = [
  {
    title: "Share your vision",
    body: "Tell the maker what you have in mind.",
  },
  {
    title: "Confirm the details",
    body: "Discuss materials, customization, sizing, and availability.",
  },
  {
    title: "Bring it to life",
    body: "The maker creates the agreed-upon piece.",
  },
] as const;

export default function CustomOrdersPage() {
  const editorial = approvedPresentation(photoPlacements.custom);

  return (
    <article>
      <section aria-labelledby="custom-hero-heading" className="border-b border-ivory/10">
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
          <div className="lg:col-span-6">
            <p className="eyebrow">Commissions</p>
            <h1 id="custom-hero-heading" className="mt-4 max-w-xl text-balance font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">
              Made for you.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-silver sm:text-lg">
              Custom leatherwork shaped around your vision, fit, and preferences.
            </p>
            <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
              <Button href={site.instagramUrl}>Request a Custom Piece</Button>
              <Button href="/gallery" variant="secondary">
                Explore the Gallery
              </Button>
            </div>
          </div>
          <div className="relative lg:col-span-5 lg:col-start-8">
            <div className="absolute -bottom-4 -right-4 hidden h-full w-full bg-oxblood lg:block" aria-hidden="true" />
            {editorial ? (
              <DemoImage
                priority
                src={editorial.src}
                alt={editorial.alt}
                objectPosition={editorial.objectPosition}
                className="relative"
                aspectClassName="aspect-[3/4] sm:aspect-[4/5]"
                sizes="(min-width: 1024px) 36vw, 100vw"
              />
            ) : null}
          </div>
        </Container>
      </section>

      <section aria-labelledby="custom-options-heading" className="py-16 sm:py-20">
        <Container>
          <h2 id="custom-options-heading" className="sr-only">
            Custom choices
          </h2>
          <ol className="grid gap-y-0 md:grid-cols-3 md:gap-x-10">
            {personalization.map((item, index) => (
              <li key={item.title} className="border-t border-ivory/10 py-8 md:border-t-0 md:border-l md:py-2 md:pl-8 first:border-t-0 first:pt-0 md:first:border-l-0 md:first:pl-0">
                <p className="eyebrow">0{index + 1}</p>
                <h3 className="mt-3 font-editorial text-3xl text-ivory">{item.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-silver">{item.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="custom-process-heading" className="border-t border-ivory/10 py-16 sm:py-20">
        <Container>
          <h2 id="custom-process-heading" className="eyebrow">
            The process
          </h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-12">
            {process.map((step, index) => (
              <li key={step.title} className="border-t border-ivory/10 pt-6">
                <p className="eyebrow">0{index + 1}</p>
                <h3 className="mt-3 font-editorial text-3xl text-ivory">{step.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-silver">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="custom-request-heading" className="border-t border-ivory/10 py-16 sm:py-20">
        <Container>
          <h2 id="custom-request-heading" className="max-w-3xl font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
            Begin something personal.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-silver">
            Have a custom piece in mind? Start a conversation with the maker.
          </p>
          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Button href={site.instagramUrl}>Message on Instagram</Button>
            <Button href={site.etsyUrl} variant="secondary">
              Visit Etsy Shop
            </Button>
          </div>
        </Container>
      </section>
    </article>
  );
}
