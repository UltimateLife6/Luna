"use client";

import { useActionState } from "react";
import { saveShipmentAction, type FormState } from "@/app/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";

const initialState: FormState = { errors: [] };

export function ShipmentForm({ orderId, carrier, trackingNumber }: { orderId: string; carrier: string; trackingNumber: string }) {
  const [state, action, pending] = useActionState(saveShipmentAction, initialState);
  const alertRef = useAlertFocus(state.errors);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      {state.errors.map((error, index) => (
        <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="text-sm text-ivory outline-none">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Carrier name
        <input className={mobileCheckoutFieldClass} name="carrier" defaultValue={carrier} maxLength={64} autoComplete="off" />
      </label>
      <label className="block text-sm text-ivory">
        Tracking number
        <input className={mobileCheckoutFieldClass} name="trackingNumber" defaultValue={trackingNumber} maxLength={64} autoComplete="off" required />
      </label>
      <p className="text-sm text-silver">Save the number you were given. This form does not buy a label or promise a delivery date.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save tracking"}
      </Button>
    </form>
  );
}
