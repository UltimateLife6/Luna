"use client";

import { useActionState } from "react";
import { updateQuoteAction, type FormState } from "@/app/admin/quote-actions";
import { Button } from "@/components/ui/Button";
import type { QuoteStatus } from "@/lib/commerce/quotes";

const initialState: FormState = { errors: [] };

export function QuoteReviewForm({ id, status, adminNote }: { id: string; status: QuoteStatus; adminNote: string }) {
  const [state, action, pending] = useActionState(updateQuoteAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="id" value={id} />
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Review status
        <select className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="status" defaultValue={status}>
          <option value="received">Received</option>
          <option value="reviewing">Reviewing</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <label className="block text-sm text-ivory">
        Internal note
        <textarea className="mt-2 min-h-28 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="adminNote" maxLength={500} defaultValue={adminNote} />
      </label>
      <p className="text-sm leading-relaxed text-silver">This note is not a price and not a production date.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Update quote request"}
      </Button>
    </form>
  );
}
