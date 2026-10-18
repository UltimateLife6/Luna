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
              A gallery, still quiet.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-silver sm:text-base">
            {preview.length === 0
              ? "Approved photographs will replace these frames. Nothing pictured here is a Luna Fae piece."
              : "Supplied photographs. They are not verified as catalog products, and the people pictured are not identified as the maker."}
          </p>
        </div>
        {preview.length > 0 ? (
          <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5">
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
          <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5">
            {conceptFrames.map((frame) => (
              <li key={frame.label} className={frame.className}>
                <DemoImage
                  decorative
                  kicker="Concept imagery"
                  label={frame.label}
                  alt=""
                  aspectClassName={frame.aspectClassName}
                  sizes="(min-width: 768px) 40vw, 100vw"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-silver">
            {preview.length === 0 ? "No portfolio entries are on file." : `${preview.length} placed in this preview.`}
          </p>
          <Button href="/gallery" variant="secondary">
            View the gallery
          </Button>
        </div>
      </Container>
    </section>
  );
}
