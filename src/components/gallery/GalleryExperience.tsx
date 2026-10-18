"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DemoImage } from "@/components/ui/DemoImage";
import { categoryLabel, galleryCategories, galleryFrames, isConceptGallery, type GalleryCategory, type GalleryFrame } from "@/lib/gallery";
import { cn } from "@/lib/cn";

export function GalleryExperience() {
  const frames = galleryFrames();
  const concept = isConceptGallery();
  const [category, setCategory] = useState<GalleryCategory>("all");
  const [active, setActive] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const visible = category === "all" ? frames : frames.filter((frame) => frame.category === category);
  const statusId = useId();

  useEffect(() => {
    if (active !== null || !opener.current) {
      return;
    }

    const trigger = opener.current;
    opener.current = null;
    trigger.focus();
  }, [active]);

  function open(index: number, trigger: HTMLElement) {
    opener.current = trigger;
    setActive(index);
  }

  function close() {
    setActive(null);
  }

  return (
    <div className="pb-16 sm:pb-24">
      <Container>
        <div className="flex flex-col gap-6 border-t border-ivory/10 pt-8">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Gallery categories">
            {galleryCategories.map((item) => {
              const selected = item.id === category;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setCategory(item.id);
                    setActive(null);
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center border px-4 text-xs uppercase tracking-[0.16em]",
                    selected ? "border-ivory bg-oxblood text-ivory" : "border-ivory/25 text-silver",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p id={statusId} className="text-sm text-silver" aria-live="polite">
            {visible.length === 0
              ? "No frames in this category."
              : concept
                ? `Showing ${visible.length} concept ${visible.length === 1 ? "frame" : "frames"}. Not portfolio photographs.`
                : frames.some((frame) => frame.usage === "private-preview")
                  ? `Showing ${visible.length} ${visible.length === 1 ? "photograph" : "photographs"} for this private preview. Credit, model permission, and public publication are unverified.`
                  : `Showing ${visible.length} ${visible.length === 1 ? "record" : "records"}.`}
          </p>
        </div>
        {visible.length === 0 ? (
          <p className="mt-10 max-w-md font-editorial text-3xl text-ivory">This category is empty.</p>
        ) : (
          <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3" aria-describedby={statusId}>
            {visible.map((frame, index) => (
              <li key={frame.id} className="mb-4 break-inside-avoid">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={(event) => open(index, event.currentTarget)}
                >
                  <DemoImage
                    src={frame.src}
                    alt=""
                    decorative
                    kicker={kickerFor(frame)}
                    label={frame.label}
                    aspectClassName={frame.aspectClassName}
                    objectPosition={frame.objectPosition}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                  />
                  <span className="mt-3 block eyebrow">{categoryLabel(frame.category)}</span>
                  <span className="mt-2 block text-sm text-ivory">{frame.label}</span>
                  <span className="sr-only">Open the frame.</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Container>
      {active !== null && visible[active] ? (
        <Lightbox
          frame={visible[active]}
          index={active}
          total={visible.length}
          onClose={close}
          onPrevious={() => setActive((current) => (current === null ? 0 : (current - 1 + visible.length) % visible.length))}
          onNext={() => setActive((current) => (current === null ? 0 : (current + 1) % visible.length))}
        />
      ) : null}
    </div>
  );
}

function Lightbox({
  frame,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
}: {
  frame: GalleryFrame;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-obsidian p-0 text-ivory backdrop:bg-obsidian/80"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNext();
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPrevious();
        }
      }}
    >
      <div className="flex h-full flex-col overflow-y-auto px-5 py-6 sm:px-8">
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mx-auto mt-6 w-full max-w-3xl">
          <DemoImage
            src={frame.src}
            alt={frame.alt}
            kicker={kickerFor(frame)}
            label={frame.label}
            aspectClassName={frame.src ? frame.aspectClassName : "aspect-[4/3] sm:aspect-[5/4]"}
            objectPosition={frame.objectPosition}
            sizes="(min-width: 768px) 48rem, 100vw"
          />
          <p id={titleId} className="mt-6 font-editorial text-4xl leading-tight text-ivory sm:text-5xl">
            {frame.label}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-silver">{captionFor(frame)}</p>
          <p className="sr-only" aria-live="polite">
            Showing {frame.label}, frame {index + 1} of {total}.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-silver">
            {index + 1} / {total}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onPrevious}>
              Previous
            </Button>
            <Button variant="secondary" onClick={onNext}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function kickerFor(frame: GalleryFrame): string {
  if (frame.usage === "private-preview") {
    return "Private preview";
  }

  if (frame.status === "verified") {
    return "Verified";
  }

  if (frame.status === "demo") {
    return "Demo record";
  }

  return "Concept imagery";
}

function captionFor(frame: GalleryFrame): string {
  if (frame.status === "verified") {
    return frame.alt;
  }

  if (frame.usage === "private-preview") {
    return `${frame.alt} Private local preview. The person is not identified as the maker. Photographer credit, model permission, and public publication are unverified. This is not a product for sale.`;
  }

  if (frame.status === "demo") {
    return "Demo record. This is not presented as a verified Luna Fae photograph.";
  }

  return "Illustrative concept frame. Not a photograph of Luna Fae work.";
}
