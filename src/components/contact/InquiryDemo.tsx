"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inquiryTopicLabel, inquiryTopics, type InquiryTopic } from "@/lib/contact";
import { cn } from "@/lib/cn";

const previewMessage = "This is a demonstration of a contact note. Nothing has been sent to Luna Fae Leathers.";

export function InquiryDemo() {
  const [topic, setTopic] = useState<InquiryTopic>();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState(false);
  const noteId = useId();
  const errorId = useId();

  function previewNote() {
    if (!topic) {
      setError("Choose a topic to continue.");
      return;
    }

    setError(undefined);
    setPreview(true);
  }

  function reset() {
    setTopic(undefined);
    setNote("");
    setError(undefined);
    setPreview(false);
  }

  if (preview) {
    return (
      <div>
        <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Preview only.</h2>
        <p role="status" className="mt-6 max-w-xl text-base leading-relaxed text-ivory">
          {previewMessage}
        </p>
        <dl className="mt-8 border-t border-ivory/10">
          <div className="border-b border-ivory/10 py-4">
            <dt className="eyebrow">Topic</dt>
            <dd className="mt-2 text-sm text-ivory">{inquiryTopicLabel(topic)}</dd>
          </div>
          <div className="border-b border-ivory/10 py-4">
            <dt className="eyebrow">Note</dt>
            <dd className="mt-2 break-words text-sm leading-relaxed text-ivory">{note.trim() || "None"}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-silver">Held in this page only. Closing or reloading clears it.</p>
        <div className="mt-8">
          <Button variant="secondary" onClick={reset}>
            Start again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">Try a note.</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-silver">
        Choose an example topic. Leave out names, email addresses, and other personal details. The note stays in this browser.
      </p>
      <fieldset className="mt-8" aria-describedby={error ? errorId : undefined}>
        <legend className="eyebrow">Topic</legend>
        <div className="mt-4 grid gap-2">
          {inquiryTopics.map((item) => {
            const checked = topic === item.id;

            return (
              <label
                key={item.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 border px-4 text-sm",
                  checked ? "border-ivory bg-oxblood text-ivory" : "border-ivory/25 text-silver",
                )}
              >
                <input
                  type="radio"
                  name="inquiry-topic"
                  value={item.id}
                  checked={checked}
                  onChange={() => {
                    setTopic(item.id);
                    setError(undefined);
                  }}
                  className="size-4 accent-burgundy"
                />
                {item.label}
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
      <label htmlFor={noteId} className="mt-8 block eyebrow">
        Note
      </label>
      <textarea
        id={noteId}
        value={note}
        maxLength={400}
        onChange={(event) => setNote(event.target.value)}
        className="mt-3 min-h-36 w-full border border-ivory/40 bg-obsidian px-4 py-3 text-base leading-relaxed text-ivory outline-none"
      />
      <p className="mt-2 text-xs text-silver">{note.length} / 400</p>
      <div className="mt-8">
        <Button onClick={previewNote}>Preview this note</Button>
      </div>
    </div>
  );
}
