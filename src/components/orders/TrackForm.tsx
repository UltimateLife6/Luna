"use client";

import { useActionState } from "react";
import { openTrackingAction, type TrackingFormState } from "@/app/orders/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";

const initialState: TrackingFormState = { errors: [] };

export function TrackForm() {
  const [state, action, pending] = useActionState(openTrackingAction, initialState);
  const alertRef = useAlertFocus(state.errors);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.errors.map((error, index) => (
        <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="text-sm text-ivory outline-none">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Tracking token
        <input className={mobileCheckoutFieldClass} name="token" autoComplete="off" required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking" : "View status"}
      </Button>
    </form>
  );
}
