import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { approvedPresentation, photoPlacements } from "@/data/image-assets";
import { conceptFrames } from "@/lib/home";

export function GalleryPreview() {
  const placed = photoPlacements.galleryPreview.map((id, index) => {
    const photo = approvedPresentation(id);
    const frame = conceptFrames[index];

    return photo && frame
      ? { ...photo, className: frame.className, aspectClassName: frame.aspectClassName }
      : null;
  });
  const preview = placed.every((item) => item !== null) ? placed : [];

  return (
    <section aria-labelledby="home-gallery-heading" className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 id="home-gallery-heading" className="mt-4 max-w-xl font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
              From the work.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-silver sm:text-base">
            {preview.length === 0 ? "Photographs will be placed here." : "Harnesses, collars, and the hardware that finishes a piece."}
          </p>
        </div>
        {preview.length > 0 ? (
          <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-5">
            {preview.map((item) => (
              <li key={item.label} className={item.className}>
                <DemoImage
                  src={item.src}
                  alt={item.alt}
                  objectPosition={item.objectPosition}
                  kicker="Photograph"
                  label={item.label}
                  aspectClassName={item.aspectClassName}
                  sizes="(min-width: 768px) 40vw, 100vw"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-12 border border-ivory/10 bg-oxblood px-6 py-12 sm:px-10">
            <p className="eyebrow text-ivory/80">Portfolio</p>
            <p className="mt-4 max-w-xl font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Photographs will be placed here.</p>
          </div>
        )}
        <div className="mt-10">
          <Button href="/gallery" variant="secondary">
            View the gallery
          </Button>
        </div>
      </Container>
    </section>
  );
}
