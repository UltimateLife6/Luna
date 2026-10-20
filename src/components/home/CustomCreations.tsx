import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { commissionNotes } from "@/lib/home";

export function CustomCreations() {
  const custom = approvedPresentation(photoPlacements.custom);

  return (
    <section aria-labelledby="home-custom-heading" className="border-t border-ivory/10 py-16 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="relative lg:col-span-5">
          <div className="absolute -bottom-4 -left-4 hidden h-full w-full bg-oxblood lg:block" aria-hidden="true" />
          {custom ? (
            <DemoImage
              src={custom.src}
              alt={custom.alt}
              objectPosition={custom.objectPosition}
              className="relative"
              aspectClassName="aspect-[4/5]"
              sizes="(min-width: 1024px) 36vw, 100vw"
            />
          ) : null}
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="eyebrow">Commissions</p>
          <h2 id="home-custom-heading" className="mt-4 font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
            A piece shaped to the wearer.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-silver">
            Stitching, buckle color, and sizing are chosen with each custom piece.
          </p>
          <ol className="mt-10 max-w-md">
            {commissionNotes.map((note, index) => (
              <li key={note.title} className="border-t border-ivory/10 py-6">
                <p className="eyebrow">0{index + 1}</p>
                <h3 className="mt-2 font-editorial text-3xl text-ivory">{note.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver">{note.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button href="/custom">Begin a custom piece</Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
