"use client";

import Link from "next/link";
import { useActionState } from "react";
import { checkoutAction, removeCartItemAction, updateCartItemAction, type FormState } from "@/app/cart/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import { mobileCheckoutFieldClass, checkoutCanStart } from "@/lib/commerce/mobile";

const initialState: FormState = { errors: [] };

export type CartEditorLine = {
  id: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  skuLabel: string;
  quantity: number;
  unitLabel: string;
  lineLabel: string;
  unavailableReason: string | null;
  selections: { groupLabel: string; optionLabel: string }[];
  leadTimeNote: string;
};

export function CartEditor({
  lines,
  subtotalLabel,
  blockers,
}: {
  lines: CartEditorLine[];
  subtotalLabel: string;
  blockers: string[];
}) {
  return (
    <div className="mt-12 space-y-10">
      <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
        {lines.map((line) => (
          <li key={line.id} className="py-6">
            <CartLineForm line={line} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-ivory">Subtotal {subtotalLabel}</p>
      <p className="max-w-2xl text-sm leading-relaxed text-silver">Shipping is added at checkout. Tax is not added.</p>
      {blockers.length > 0 ? (
        <p role="status" className="max-w-2xl border border-ivory/20 px-4 py-4 text-sm text-ivory">
          Checkout is not available yet.
        </p>
      ) : null}
      <CheckoutForm disabled={blockers.length > 0 || lines.some((line) => line.unavailableReason)} />
    </div>
  );
}

function CartLineForm({ line }: { line: CartEditorLine }) {
  const [state, action, pending] = useActionState(updateCartItemAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeCartItemAction, initialState);
  const alertRef = useAlertFocus(state.errors);
  const removeAlertRef = useAlertFocus(removeState.errors);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {line.productSlug ? (
          <Link href={`/catalog/${line.productSlug}`} className="font-editorial text-3xl text-ivory">
            {line.productName}
          </Link>
        ) : (
          <p className="font-editorial text-3xl text-ivory">{line.productName}</p>
        )}
        <p className="mt-2 text-sm text-silver">
          {line.variantLabel} · {line.skuLabel}
        </p>
        {line.selections.map((selection) => (
          <p key={`${selection.groupLabel}-${selection.optionLabel}`} className="mt-1 text-sm text-silver">
            {selection.groupLabel}: {selection.optionLabel}
          </p>
        ))}
        {line.leadTimeNote ? <p className="mt-2 text-sm text-ivory">Production note stored with this product: {line.leadTimeNote}</p> : null}
        {line.unavailableReason ? <p className="mt-2 text-sm text-ivory">{line.unavailableReason}</p> : null}
        <p className="mt-2 text-sm text-ivory">
          {line.unitLabel} each · {line.lineLabel}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:col-span-5">
        <form action={action} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
          <input type="hidden" name="itemId" value={line.id} />
          <label className="w-full text-sm text-ivory sm:w-auto">
            Quantity
            <input
              className={`${mobileCheckoutFieldClass} sm:w-28`}
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              defaultValue={line.quantity}
            />
          </label>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Saving" : "Update"}
          </Button>
          {state.errors.map((error, index) => (
            <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="w-full text-sm text-ivory outline-none">
              {error}
            </p>
          ))}
        </form>
        <form action={removeAction}>
          <input type="hidden" name="itemId" value={line.id} />
          <button type="submit" className="min-h-12 text-xs uppercase tracking-[0.16em] text-silver" disabled={removing}>
            {removing ? "Removing" : "Remove"}
          </button>
          {removeState.errors.map((error, index) => (
            <p key={error} ref={index === 0 ? removeAlertRef : undefined} tabIndex={-1} role="alert" className="text-sm text-ivory outline-none">
              {error}
            </p>
          ))}
        </form>
      </div>
    </div>
  );
}

function CheckoutForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(checkoutAction, initialState);
  const alertRef = useAlertFocus(state.errors);
  const canStart = checkoutCanStart({ blockers: disabled ? 1 : 0, unavailableLines: 0 });

  return (
    <form action={action} className="space-y-4">
      {state.errors.map((error, index) => (
        <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="max-w-2xl text-sm text-ivory outline-none">
          {error}
        </p>
      ))}
      <Button type="submit" disabled={!canStart || pending}>
        {pending ? "Starting checkout" : "Continue to Stripe test checkout"}
      </Button>
      <p className="text-sm text-silver">Guest checkout stays available. An account is optional.</p>
      <p className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <Link href="/orders/track" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
          Track an order
        </Link>
        <Link href="/account" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
          Account
        </Link>
      </p>
    </form>
  );
}
