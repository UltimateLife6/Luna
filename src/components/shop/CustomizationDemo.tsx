"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { CustomizationGroup } from "@/types/catalog";

type CustomizationDemoProps = {
  groups: CustomizationGroup[];
};

export function CustomizationDemo({ groups }: CustomizationDemoProps) {
  const [selection, setSelection] = useState<Record<string, string>>({});

  return (
    <div>
      <h2 id="example-options-heading" className="font-editorial text-3xl text-ivory sm:text-4xl">
        Example options
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-silver">
        Choose a sample to see it summarized below. The choice stays on this page. It does not place an order, set a price, or save any information.
      </p>
      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <fieldset key={group.kind}>
            <legend className="font-editorial text-2xl text-ivory">{group.label}</legend>
            <p id={`${group.kind}-note`} className="mt-2 text-sm leading-relaxed text-silver">
              {group.note}
            </p>
            <div className="mt-4 grid gap-2">
              {group.options.map((option) => {
                const checked = selection[group.kind] === option.id;

                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 border px-4 text-sm",
                      checked ? "border-ivory bg-oxblood text-ivory" : "border-ivory/25 text-silver",
                    )}
                  >
                    <input
                      type="radio"
                      name={group.kind}
                      value={option.id}
                      checked={checked}
                      onChange={() => setSelection((current) => ({ ...current, [group.kind]: option.id }))}
                      className="size-4 accent-burgundy"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div id="selection-summary" aria-live="polite" aria-atomic="true" className="mt-8 border-l border-burgundy py-1 pl-5">
        <h3 className="eyebrow">Selection summary</h3>
        <dl className="mt-4 space-y-3">
          {groups.map((group) => {
            const selected = group.options.find((option) => option.id === selection[group.kind]);

            return (
              <div key={group.kind}>
                <dt className="text-xs uppercase tracking-[0.16em] text-silver">{group.label}</dt>
                <dd className="mt-1 text-sm text-ivory">{selected ? selected.label : "None selected"}</dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-silver">Held in this page only. Nothing is ordered, priced, or saved.</p>
      </div>
    </div>
  );
}
