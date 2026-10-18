"use client";

import { useActionState } from "react";
import { rotateTrackingAction, type FormState } from "@/app/admin/order-actions";
import { Button } from "@/components/ui/Button";

const initialState: FormState = { errors: [] };

export function TrackingRotateForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(rotateTrackingAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
      {state.notice ? <p className="break-all text-sm text-ivory">{state.notice}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Rotating" : "Revoke and rotate tracking link"}
      </Button>
    </form>
  );
}
