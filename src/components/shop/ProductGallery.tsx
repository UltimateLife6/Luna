"use client";

import { useRef, useState } from "react";
import { DemoImage } from "@/components/ui/DemoImage";
import { cn } from "@/lib/cn";
import type { CatalogImage } from "@/types/catalog";

type ProductGalleryProps = {
  name: string;
  images: CatalogImage[];
};

export function ProductGallery({ name, images }: ProductGalleryProps) {
  const frames = images.length > 0 ? images : [fallbackFrame(name)];
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const image = frames[active] ?? frames[0];

  function show(index: number, moveFocus = false) {
    const next = (index + frames.length) % frames.length;
    setActive(next);

    if (moveFocus) {
      buttons.current[next]?.focus();
    }
  }

  return (
    <div>
      <DemoImage
        src={image.src}
        alt={image.alt}
        kicker="Photograph"
        label={image.label ?? name}
        aspectClassName="aspect-[4/5]"
        sizes="(min-width: 1024px) 55vw, 100vw"
      />
      <p className="sr-only" aria-live="polite">
        Showing {image.label ?? name}, frame {active + 1} of {frames.length}.
      </p>
      {frames.length > 1 ? (
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Photographs"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              show(active + 1, true);
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              show(active - 1, true);
            }
          }}
        >
          <button type="button" className={frameControlClass(false)} onClick={() => show(active - 1)}>
            Previous frame
          </button>
          <button type="button" className={frameControlClass(false)} onClick={() => show(active + 1)}>
            Next frame
          </button>
          {frames.map((frame, index) => (
            <button
              key={`${frame.label ?? "frame"}-${index}`}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              aria-pressed={index === active}
              className={frameControlClass(index === active)}
              onClick={() => setActive(index)}
            >
              {frame.label ?? `Frame ${index + 1}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function frameControlClass(selected: boolean): string {
  return cn(
    "inline-flex min-h-11 items-center border px-4 text-[0.68rem] uppercase tracking-[0.14em]",
    selected ? "border-ivory text-ivory" : "border-ivory/25 text-silver hover:border-ivory/70 hover:text-ivory",
  );
}

function fallbackFrame(name: string): CatalogImage {
  return {
    alt: name,
    source: "concept",
    approval: "concept",
    label: "Photograph coming soon.",
  };
}
