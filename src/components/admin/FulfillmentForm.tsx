"use client";

import { useActionState } from "react";
import { updateFulfillmentAction, type FormState } from "@/app/admin/order-actions";
import { Button } from "@/components/ui/Button";
import type { FulfillmentStatus } from "@/lib/commerce/policy";

const initialState: FormState = { errors: [] };

export function FulfillmentForm({ orderId, status }: { orderId: string; status: FulfillmentStatus }) {
  const [state, action, pending] = useActionState(updateFulfillmentAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Fulfillment
        <select className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" name="fulfillment" defaultValue={status}>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="processing">Processing</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="canceled">Canceled</option>
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Update fulfillment"}
      </Button>
    </form>
  );
}
