"use client";

import { useActionState } from "react";
import { recheckReservationAction, type FormState } from "@/app/admin/order-actions";
import { Button } from "@/components/ui/Button";

const initialState: FormState = { errors: [] };

export function ReservationReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(recheckReservationAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="font-editorial text-3xl text-ivory">Reservation review</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-silver">
        Stripe has not confirmed that this Checkout can no longer be paid. The finished piece stays reserved. Recheck reads Stripe again and releases the piece only when that read shows payment cannot complete.
      </p>
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
      {state.notice ? <p className="text-sm text-ivory">{state.notice}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking Stripe" : "Recheck Stripe"}
      </Button>
    </form>
  );
}
