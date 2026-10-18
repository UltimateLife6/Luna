"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { addToCartAction, type FormState } from "@/app/cart/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import type { PublicCatalogProduct } from "@/lib/catalog-store/present";
import type { ConfigurationInput } from "@/lib/commerce/selection";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";

const initialState: FormState = { errors: [] };

export function ProductConfigurator({
  product,
  saved,
}: {
  product: PublicCatalogProduct;
  saved?: { variantId: string; configuration: ConfigurationInput } | null;
}) {
  const [state, action, pending] = useActionState(addToCartAction, initialState);
  const alertRef = useAlertFocus(state.errors);
  const [variantId, setVariantId] = useState(saved?.variantId && product.variants.some((variant) => variant.id === saved.variantId) ? saved.variantId : product.variants[0]?.id ?? "");
  const [optionIds, setOptionIds] = useState<string[]>(saved?.configuration.optionIds ?? []);
  const [texts, setTexts] = useState<Record<string, string>>(Object.fromEntries((saved?.configuration.texts ?? []).map((entry) => [entry.groupId, entry.value])));
  const [measurements, setMeasurements] = useState<Record<string, string>>(
    Object.fromEntries((saved?.configuration.measurements ?? []).map((entry) => [entry.groupId, entry.value])),
  );
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const summary = useMemo(() => {
    const lines: { label: string; value: string; amount: number }[] = [];

    if (variant) {
      lines.push({ label: "Variant", value: variant.label, amount: variant.priceMinor });
    }

    for (const group of product.customization) {
      if (group.kind === "single" || group.kind === "multi") {
        for (const option of group.options.filter((item) => optionIds.includes(item.id) && item.available)) {
          lines.push({ label: group.label, value: option.label, amount: option.adjustmentMinor });
        }
      }

      if (group.kind === "text" && texts[group.id]?.trim()) {
        lines.push({ label: group.label, value: texts[group.id].trim(), amount: 0 });
      }

      if (group.kind === "measurement" && measurements[group.id]?.trim()) {
        lines.push({ label: group.label, value: `${measurements[group.id].trim()} ${group.unit ?? ""}`.trim(), amount: 0 });
      }
    }

    return lines;
  }, [measurements, optionIds, product.customization, texts, variant]);
  const count = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const estimate = summary.reduce((total, line) => total + line.amount, 0) * count;

  function toggleOption(groupId: string, optionId: string, kind: "single" | "multi") {
    setOptionIds((current) => {
      const group = product.customization.find((item) => item.id === groupId);
      const groupOptionIds = new Set(group?.options.map((option) => option.id) ?? []);

      if (kind === "single") {
        return [...current.filter((id) => !groupOptionIds.has(id)), optionId];
      }

      return current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    });
  }

  return (
    <form action={action} className="mt-8 grid gap-10 border-t border-ivory/10 pt-8 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-7">
        <p className="text-sm leading-relaxed text-silver">
          The estimate uses prices saved on this record. A price typed into the browser is ignored. Adding an item does not charge a card.
        </p>
        {state.errors.length > 0 ? (
          <div ref={alertRef} tabIndex={-1} role="alert" className="border border-burgundy/70 px-4 py-3 text-sm text-ivory outline-none">
            {state.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
        <fieldset className="space-y-3">
          <legend className="text-sm text-ivory">Variant</legend>
          {product.variants.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm text-ivory">
              <input type="radio" name="variantId" value={item.id} checked={item.id === variantId} onChange={() => setVariantId(item.id)} required />
              <span>
                {item.label} · {item.priceLabel}
              </span>
            </label>
          ))}
        </fieldset>
        {product.customization.map((group) => (
          <fieldset key={group.id} className="space-y-3">
            <legend className="text-sm text-ivory">
              {group.label}
              {group.required ? " (required)" : " (optional)"}
            </legend>
            {group.kind === "text" ? (
              <label className="block text-sm text-ivory">
                <span className="sr-only">{group.label}</span>
                <input
                  className={mobileCheckoutFieldClass}
                  name={`text_${group.id}`}
                  maxLength={group.textMaxLength}
                  required={group.required}
                  value={texts[group.id] ?? ""}
                  onChange={(event) => setTexts((current) => ({ ...current, [group.id]: event.target.value }))}
                />
              </label>
            ) : null}
            {group.kind === "measurement" ? (
              <label className="block text-sm text-ivory">
                {group.unitName ? `Enter the measurement in ${group.unitName}.` : "Enter the measurement."}
                <input
                  className={mobileCheckoutFieldClass}
                  name={`measure_${group.id}`}
                  inputMode="decimal"
                  required={group.required && Boolean(group.unit)}
                  disabled={!group.unit}
                  aria-describedby={`${group.id}-unit`}
                  value={measurements[group.id] ?? ""}
                  onChange={(event) => setMeasurements((current) => ({ ...current, [group.id]: event.target.value }))}
                />
                <span id={`${group.id}-unit`} className="mt-2 block text-silver">
                  Unit saved with this option: {group.unitName ?? "not set"}
                  {group.min !== undefined ? ` · minimum ${group.min}` : ""}
                  {group.max !== undefined ? ` · maximum ${group.max}` : ""}
                </span>
              </label>
            ) : null}
            {group.kind === "single" || group.kind === "multi"
              ? group.options.map((option) => (
                  <label key={option.id} className="flex min-h-11 items-start gap-3 text-sm text-ivory">
                    <input
                      className="mt-1"
                      type={group.kind === "single" ? "radio" : "checkbox"}
                      name={`choice_${group.id}`}
                      value={option.id}
                      checked={option.available && optionIds.includes(option.id)}
                      disabled={!option.available}
                      required={group.required && group.kind === "single"}
                      onChange={() => toggleOption(group.id, option.id, group.kind === "multi" ? "multi" : "single")}
                    />
                    <span>
                      {option.label} · {option.adjustmentLabel}
                      {option.available ? "" : " · Unavailable"}
                    </span>
                  </label>
                ))
              : null}
          </fieldset>
        ))}
        <label className="block text-sm text-ivory">
          Quantity
          <input
            className={`${mobileCheckoutFieldClass} sm:max-w-32`}
            name="quantity"
            type="number"
            min={1}
            max={99}
            value={quantity}
            required
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding" : "Add to cart"}
        </Button>
      </div>
      <aside className="h-fit border border-ivory/15 p-5 lg:col-span-5" aria-live="polite">
        <p className="eyebrow">Your configuration</p>
        <ul className="mt-4 space-y-3 text-sm text-ivory">
          {summary.length === 0 ? <li>No selections yet.</li> : null}
          {summary.map((line) => (
            <li key={`${line.label}-${line.value}`} className="flex justify-between gap-4">
              <span>
                <span className="block text-silver">{line.label}</span>
                {line.value}
              </span>
              <span>{line.amount > 0 ? formatMinorUnits(line.amount, "USD") : ""}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-editorial text-3xl text-ivory">{variant ? formatMinorUnits(estimate, "USD") : "Price unavailable"}</p>
        <p className="mt-2 text-sm leading-relaxed text-silver">Estimated total for this quantity. Checkout uses the prices saved on the server.</p>
      </aside>
    </form>
  );
}
