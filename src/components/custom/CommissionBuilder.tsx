"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  acceptedImageTypes,
  commissionSteps,
  creationTypes,
  hardwarePreferences,
  isCreationType,
  leatherPreferences,
  maxImageBytes,
  optionLabel,
  sizingPreferences,
  type CreationType,
  type HardwarePreference,
  type LeatherPreference,
  type SizingPreference,
} from "@/lib/commission";
import { cn } from "@/lib/cn";

type ReferenceImage = {
  name: string;
  file: File;
};

type Draft = {
  creationType?: CreationType;
  leather?: LeatherPreference;
  hardware?: HardwarePreference;
  sizing?: SizingPreference;
  notes: string;
  image: ReferenceImage | null;
};

const choiceNote = "Illustrative choices. Not a confirmed offering.";
const completionMessage =
  "This is a demonstration of how a custom commission request could work. Nothing has been submitted or sent to Luna Fae Leathers.";

export function CommissionBuilder() {
  const params = useSearchParams();
  const preset = params.get("type");
  const [draft, setDraft] = useState<Draft>(() => ({
    notes: "",
    image: null,
    creationType: isCreationType(preset) ? preset : undefined,
  }));
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [error, setError] = useState<string>();
  const [imageError, setImageError] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  function goTo(index: number) {
    if (index > furthest || complete) {
      return;
    }

    setError(undefined);
    setStep(index);
  }

  function back() {
    setError(undefined);
    setStep((current) => Math.max(0, current - 1));
  }

  function next() {
    if (!stepIsValid(step, draft)) {
      setError("Choose one example to continue.");
      return;
    }

    const following = Math.min(commissionSteps.length - 1, step + 1);
    setError(undefined);
    setFurthest((reached) => Math.max(reached, following));
    setStep(following);
  }

  function chooseImage(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!acceptedImageTypes.some((type) => type === file.type)) {
      setImageError("Use a JPEG, PNG, WebP, or GIF.");
      return;
    }

    if (file.size > maxImageBytes) {
      setImageError("That image is larger than 5 MB. Choose a smaller file.");
      return;
    }

    setImageError(undefined);
    setDraft((current) => ({
      ...current,
      image: { name: file.name, file },
    }));
  }

  function removeImage() {
    setImageError(undefined);
    setDraft((current) => ({ ...current, image: null }));
  }

  function reset() {
    setDraft({ notes: "", image: null });
    setStep(0);
    setFurthest(0);
    setError(undefined);
    setImageError(undefined);
    setComplete(false);
    setCopied(false);
    setCopyError(false);
  }

  async function copySummary() {
    setCopied(false);
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(summaryText(draft));
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:items-start lg:gap-16">
      <div className="min-w-0 lg:col-span-7">
        <Progress current={step} furthest={furthest} locked={complete} onSelect={goTo} />
        {complete ? (
          <Completion copied={copied} copyError={copyError} onCopy={copySummary} onReset={reset} />
        ) : (
          <div className="mt-10">
            {step === 0 ? (
              <ChoiceStep
                title="What kind of piece?"
                note={choiceNote}
                name="creation-type"
                options={creationTypes}
                value={draft.creationType}
                error={error}
                onChange={(creationType) => {
                  setError(undefined);
                  setDraft((current) => ({ ...current, creationType }));
                }}
              />
            ) : null}
            {step === 1 ? (
              <ChoiceStep
                title="Which leather?"
                note={choiceNote}
                name="leather"
                options={leatherPreferences}
                value={draft.leather}
                error={error}
                onChange={(leather) => {
                  setError(undefined);
                  setDraft((current) => ({ ...current, leather }));
                }}
              />
            ) : null}
            {step === 2 ? (
              <ChoiceStep
                title="Which hardware?"
                note={choiceNote}
                name="hardware"
                options={hardwarePreferences}
                value={draft.hardware}
                error={error}
                onChange={(hardware) => {
                  setError(undefined);
                  setDraft((current) => ({ ...current, hardware }));
                }}
              />
            ) : null}
            {step === 3 ? (
              <ChoiceStep
                title="How should it be sized?"
                note="Example sizing paths. No measurements are collected."
                name="sizing"
                options={sizingPreferences}
                value={draft.sizing}
                error={error}
                onChange={(sizing) => {
                  setError(undefined);
                  setDraft((current) => ({ ...current, sizing }));
                }}
              />
            ) : null}
            {step === 4 ? (
              <DetailsStep
                notes={draft.notes}
                image={draft.image}
                imageError={imageError}
                onNotes={(notes) => setDraft((current) => ({ ...current, notes }))}
                onImage={chooseImage}
                onRemoveImage={removeImage}
              />
            ) : null}
            {step === 5 ? <ReviewStep draft={draft} onEdit={goTo} /> : null}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {step > 0 ? (
                <Button variant="secondary" onClick={back}>
                  Back
                </Button>
              ) : null}
              {step < commissionSteps.length - 1 ? (
                <Button onClick={next}>Next</Button>
              ) : (
                <Button onClick={() => setComplete(true)}>Preview Request Summary</Button>
              )}
            </div>
          </div>
        )}
      </div>
      <aside className="min-w-0 lg:col-span-5" aria-label="Selection summary">
        <div className="border border-ivory/10 px-5 py-6 lg:sticky lg:top-32">
          <SelectionSummary draft={draft} />
        </div>
      </aside>
    </div>
  );
}

export function CommissionBuilderFallback() {
  return (
    <p role="status" className="text-sm text-silver">
      Loading the commission example.
    </p>
  );
}

function Progress({
  current,
  furthest,
  locked,
  onSelect,
}: {
  current: number;
  furthest: number;
  locked: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Commission steps">
      <ol className="flex gap-2">
        {commissionSteps.map((item, index) => {
          const reached = index <= furthest && !locked;
          const active = index === current && !locked;
          const filled = index <= current;

          return (
            <li key={item.id} className="min-w-0 flex-1">
              {reached ? (
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => onSelect(index)}
                  className="block w-full py-2 text-left"
                >
                  <span className={cn("block h-px w-full", filled ? "bg-burgundy" : "bg-ivory/25")} />
                  <span className={cn("mt-3 hidden text-[0.68rem] uppercase tracking-[0.14em] lg:block", active ? "text-ivory" : "text-silver")}>
                    {item.label}
                  </span>
                </button>
              ) : (
                <div className="py-2">
                  <span className={cn("block h-px w-full", filled ? "bg-burgundy" : "bg-ivory/15")} />
                  <span className="mt-3 hidden text-[0.68rem] uppercase tracking-[0.14em] text-silver/70 lg:block">{item.label}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm text-silver lg:hidden">
        Step {current + 1} of {commissionSteps.length}
        <span className="text-ivory"> · {commissionSteps[current]?.label}</span>
      </p>
    </nav>
  );
}

function ChoiceStep<T extends string>({
  title,
  note,
  name,
  options,
  value,
  error,
  onChange,
}: {
  title: string;
  note: string;
  name: string;
  options: readonly { id: T; label: string }[];
  value: T | undefined;
  error?: string;
  onChange: (value: T) => void;
}) {
  const errorId = useId();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">{title}</legend>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-silver">{note}</p>
      <div className="mt-8 grid gap-2">
        {options.map((option) => {
          const checked = value === option.id;

          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 border px-4 text-sm",
                checked ? "border-ivory bg-oxblood text-ivory" : "border-ivory/25 text-silver",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(option.id)}
                className="size-4 accent-burgundy"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-4 text-sm text-ivory">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function DetailsStep({
  notes,
  image,
  imageError,
  onNotes,
  onImage,
  onRemoveImage,
}: {
  notes: string;
  image: ReferenceImage | null;
  imageError?: string;
  onNotes: (notes: string) => void;
  onImage: (file: File | undefined) => void;
  onRemoveImage: () => void;
}) {
  const notesId = useId();
  const imageId = useId();
  const imageErrorId = useId();
  const previewRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const node = previewRef.current;

    if (!node || !image) {
      return;
    }

    const url = URL.createObjectURL(image.file);
    node.src = url;

    return () => {
      URL.revokeObjectURL(url);
      node.removeAttribute("src");
    };
  }, [image]);

  return (
    <div>
      <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Any design notes?</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-silver">
        Optional. Leave out names, email addresses, and other personal details. The note stays in this page.
      </p>
      <label htmlFor={notesId} className="mt-8 block eyebrow">
        Design notes
      </label>
      <textarea
        id={notesId}
        value={notes}
        maxLength={500}
        onChange={(event) => onNotes(event.target.value)}
        className="mt-3 min-h-36 w-full border border-ivory/40 bg-obsidian px-4 py-3 text-base leading-relaxed text-ivory outline-none"
      />
      <p className="mt-2 text-xs text-silver">{notes.length} / 500</p>
      <label htmlFor={imageId} className="mt-8 block eyebrow">
        Reference image
      </label>
      <p id={`${imageId}-note`} className="mt-3 max-w-lg text-sm leading-relaxed text-silver">
        JPEG, PNG, WebP, or GIF, up to 5 MB. The preview stays in this browser and is not uploaded.
      </p>
      <input
        id={imageId}
        type="file"
        accept={acceptedImageTypes.join(",")}
        aria-describedby={imageError ? `${imageId}-note ${imageErrorId}` : `${imageId}-note`}
        onChange={(event) => {
          onImage(event.target.files?.[0]);
          event.target.value = "";
        }}
        className="mt-4 block w-full text-sm text-silver file:mr-4 file:min-h-11 file:border-0 file:bg-burgundy file:px-4 file:text-xs file:uppercase file:tracking-[0.16em] file:text-ivory"
      />
      {imageError ? (
        <p id={imageErrorId} role="alert" className="mt-3 text-sm text-ivory">
          {imageError}
        </p>
      ) : null}
      {image ? (
        <div className="mt-6">
          {/* Blob URLs are local previews. next/image cannot serve them without an upload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={previewRef} alt="Local reference preview. This image has not been uploaded." className="max-h-64 w-full bg-oxblood object-contain" />
          <p className="mt-3 break-all text-sm text-silver">{image.name}</p>
          <button type="button" onClick={onRemoveImage} className="mt-2 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReviewStep({ draft, onEdit }: { draft: Draft; onEdit: (index: number) => void }) {
  const rows = reviewRows(draft);

  return (
    <div>
      <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Review the example.</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-silver">
        These are the choices held in this page. Previewing the summary does not send them.
      </p>
      <dl className="mt-8 border-t border-ivory/10">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b border-ivory/10 py-4">
            <div>
              <dt className="eyebrow">{row.label}</dt>
              <dd className="mt-2 break-words text-sm leading-relaxed text-ivory">{row.value}</dd>
            </div>
            <button type="button" onClick={() => onEdit(row.step)} className="inline-flex min-h-11 shrink-0 items-center text-xs uppercase tracking-[0.16em] text-ivory">
              Edit
            </button>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SelectionSummary({ draft }: { draft: Draft }) {
  return (
    <div>
      <p className="eyebrow">This example</p>
      <dl className="mt-6 space-y-4">
        {reviewRows(draft).map((row) => (
          <div key={row.label}>
            <dt className="text-xs uppercase tracking-[0.16em] text-silver">{row.label}</dt>
            <dd className="mt-1 break-words text-sm leading-relaxed text-ivory">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 border-t border-ivory/10 pt-4 text-sm leading-relaxed text-silver">Nothing on this page is priced or sent.</p>
    </div>
  );
}

function Completion({
  copied,
  copyError,
  onCopy,
  onReset,
}: {
  copied: boolean;
  copyError: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-10">
      <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Preview only.</h2>
      <p role="status" className="mt-6 max-w-xl text-base leading-relaxed text-ivory">
        {completionMessage}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onCopy}>Copy summary</Button>
        <Button variant="secondary" onClick={onReset}>
          Start again
        </Button>
      </div>
      {copied ? (
        <p role="status" className="mt-4 text-sm text-silver">
          The text summary is on the clipboard.
        </p>
      ) : null}
      {copyError ? (
        <p role="alert" className="mt-4 text-sm text-ivory">
          Copy is unavailable in this browser.
        </p>
      ) : null}
    </div>
  );
}

function reviewRows(draft: Draft) {
  const notes = draft.notes.trim();

  return [
    { step: 0, label: "Creation type", value: optionLabel(creationTypes, draft.creationType) },
    { step: 1, label: "Leather preference", value: optionLabel(leatherPreferences, draft.leather) },
    { step: 2, label: "Hardware preference", value: optionLabel(hardwarePreferences, draft.hardware) },
    { step: 3, label: "Sizing preference", value: optionLabel(sizingPreferences, draft.sizing) },
    { step: 4, label: "Design notes", value: notes || "None" },
    { step: 4, label: "Reference image", value: draft.image ? "Local preview on this device" : "None" },
  ];
}

function stepIsValid(step: number, draft: Draft): boolean {
  if (step === 0) {
    return Boolean(draft.creationType);
  }

  if (step === 1) {
    return Boolean(draft.leather);
  }

  if (step === 2) {
    return Boolean(draft.hardware);
  }

  if (step === 3) {
    return Boolean(draft.sizing);
  }

  return true;
}

function summaryText(draft: Draft): string {
  const rows = reviewRows(draft)
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");

  return `Luna Fae Leathers concept commission\nThis summary is a demonstration. It has not been sent.\n\n${rows}`;
}
