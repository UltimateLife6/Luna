"use client";

import { useActionState } from "react";
import { submitQuoteAction, type FormState } from "@/app/quotes/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";

const initialState: FormState = { errors: [], saved: false };
const fieldClass = mobileCheckoutFieldClass;

export function QuoteRequestForm({ productId, productName }: { productId: string; productName: string }) {
  const [state, action, pending] = useActionState(submitQuoteAction, initialState);
  const alertRef = useAlertFocus(state.errors);

  if (state.saved) {
    return (
      <div className="mt-8 border border-ivory/15 p-5" role="status">
        <p className="font-editorial text-3xl text-ivory">Request saved.</p>
        <p className="mt-3 text-sm leading-relaxed text-silver">
          {productName} was not charged. No price or production date is set until the maker confirms it.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-5 border-t border-ivory/10 pt-8" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm leading-relaxed text-silver">
        This record is quote-only. The request is saved for review and is not a purchase. Nothing here sets a price or a production date.
      </p>
      {state.errors.map((error, index) => (
        <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="border border-burgundy/70 px-4 py-3 text-sm text-ivory outline-none">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Name
        <input className={fieldClass} name="contactName" required maxLength={80} autoComplete="name" />
      </label>
      <label className="block text-sm text-ivory">
        Email
        <input className={fieldClass} name="email" type="email" required maxLength={120} autoComplete="email" />
      </label>
      <label className="block text-sm text-ivory">
        Requested details
        <textarea className={`${fieldClass} min-h-36`} name="details" required minLength={10} maxLength={2000} />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Request a quote"}
      </Button>
    </form>
  );
}
