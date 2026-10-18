import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { commissionNotes } from "@/lib/home";

export function CustomCreations() {
  const custom = approvedPresentation(photoPlacements.custom);

  return (
    <section aria-labelledby="home-custom-heading" className="bg-oxblood text-ivory">
      <Container className="py-16 sm:py-24">
        <p className="eyebrow text-ivory/75">Commissions</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-end">
          <h2 id="home-custom-heading" className="font-editorial text-4xl leading-[1.05] sm:text-6xl lg:col-span-7">
            Custom creations.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-ivory/80 sm:text-base lg:col-span-5">
            The commission builder walks through a leather color, hardware choice, size, and notes. It is a demonstration. No request can be submitted.
          </p>
        </div>
        {custom ? (
          <div className="mt-12 max-w-md">
            <DemoImage
              src={custom.src}
              alt={custom.alt}
              objectPosition={custom.objectPosition}
              aspectClassName="aspect-square"
              sizes="(min-width: 768px) 28rem, 100vw"
            />
            <p className="mt-3 text-sm leading-relaxed text-ivory/75">
              A supplied photograph of a person wearing a harness. This person is not identified as the maker, and the piece is not offered here.
            </p>
          </div>
        ) : null}
        <ol className="mt-14 grid gap-10 border-t border-ivory/20 pt-10 md:grid-cols-3">
          {commissionNotes.map((note, index) => (
            <li key={note.title}>
              <p className="eyebrow text-ivory/70">0{index + 1}</p>
              <h3 className="mt-3 font-editorial text-3xl">{note.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory/80">{note.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <Button href="/custom" variant="secondary" className="border-ivory/50 hover:border-ivory">
            Custom Creations
          </Button>
        </div>
      </Container>
    </section>
  );
}
