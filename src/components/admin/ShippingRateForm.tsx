"use client";

import { useActionState } from "react";
import { saveShippingRateAction, setShippingRateActiveAction, type FormState } from "@/app/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { formatMinorUnits } from "@/lib/catalog-store/money";

const initialState: FormState = { errors: [] };
const fieldClass = "mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory";

export function ShippingRateForm({
  rates,
}: {
  rates: { id: string; label: string; amountMinor: number; countries: string[]; active: boolean }[];
}) {
  const [state, action, pending] = useActionState(saveShippingRateAction, initialState);

  return (
    <section className="mt-16 border-t border-ivory/10 pt-10" aria-labelledby="shipping-heading">
      <h2 id="shipping-heading" className="font-editorial text-4xl text-ivory">
        Shipping rates
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-silver">
        No rate is created automatically. Enter a label, an amount in USD minor units, and the country codes that rate covers. Active rates must share the same country list, and each active amount must be unique. Tax is not calculated.
      </p>
      {rates.length === 0 ? <p className="mt-6 text-sm text-silver">No shipping rate is saved.</p> : null}
      <ul className="mt-6 divide-y divide-ivory/10 border-y border-ivory/10">
        {rates.map((rate) => (
          <li key={rate.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ivory">
              {rate.label} · {formatMinorUnits(rate.amountMinor, "USD")} · {rate.countries.join(", ")} · {rate.active ? "Active" : "Inactive"}
            </p>
            <RateActiveForm id={rate.id} active={rate.active} />
          </li>
        ))}
      </ul>
      <form action={action} className="mt-8 grid gap-4 sm:grid-cols-2">
        {state.errors.map((error) => (
          <p key={error} role="alert" className="text-sm text-ivory sm:col-span-2">
            {error}
          </p>
        ))}
        <label className="block text-sm text-ivory">
          Label
          <input className={fieldClass} name="label" maxLength={80} required />
        </label>
        <label className="block text-sm text-ivory">
          Amount in minor units
          <input className={fieldClass} name="amountMinor" inputMode="numeric" required />
        </label>
        <label className="block text-sm text-ivory sm:col-span-2">
          Country codes
          <input className={fieldClass} name="countries" placeholder="US" required />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save shipping rate"}
        </Button>
      </form>
    </section>
  );
}

function RateActiveForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(setShippingRateActiveAction, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {active ? "Deactivate" : "Activate"}
      </Button>
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
    </form>
  );
}
