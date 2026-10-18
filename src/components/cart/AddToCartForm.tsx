"use client";

import { useActionState } from "react";
import { addToCartAction, type FormState } from "@/app/cart/actions";
import { Button } from "@/components/ui/Button";
import type { PublicCatalogProduct } from "@/lib/catalog-store/present";

const initialState: FormState = { errors: [] };

export function AddToCartForm({ product }: { product: PublicCatalogProduct }) {
  const [state, action, pending] = useActionState(addToCartAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-5 border-t border-ivory/10 pt-8">
      <p className="text-sm leading-relaxed text-silver">
        The price is taken from this catalog record. A submitted price is ignored. Adding an item does not charge a card.
      </p>
      {state.errors.length > 0 ? (
        <div role="alert" className="border border-burgundy/70 px-4 py-3 text-sm text-ivory">
          {state.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      <label className="block text-sm text-ivory">
        Variant
        <select className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="variantId" defaultValue={product.variants[0]?.id}>
          {product.variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label} · {variant.priceLabel}
            </option>
          ))}
        </select>
      </label>
      {product.customization.map((group) => (
        <label key={group.id} className="block text-sm text-ivory">
          {group.label}
          <select className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="optionId" defaultValue={group.options[0]?.id}>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.adjustmentLabel}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="block text-sm text-ivory">
        Quantity
        <input className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="quantity" type="number" min={1} max={99} defaultValue={1} required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding" : "Add to cart"}
      </Button>
    </form>
  );
}
