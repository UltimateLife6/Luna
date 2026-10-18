"use client";

import { useActionState } from "react";
import { registerCustomerAction, signInCustomerAction, type AccountFormState } from "@/app/account/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";

const initialState: AccountFormState = { errors: [], notice: "" };

export function AccountForms() {
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <AccountForm title="Create an account" action={registerCustomerAction} submitLabel="Create account" />
      <AccountForm title="Sign in" action={signInCustomerAction} submitLabel="Sign in" />
    </div>
  );
}

function AccountForm({
  title,
  action,
  submitLabel,
}: {
  title: string;
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const alertRef = useAlertFocus(state.errors);

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="font-editorial text-3xl text-ivory">{title}</h2>
      {state.errors.map((error, index) => (
        <p key={error} ref={index === 0 ? alertRef : undefined} tabIndex={-1} role="alert" className="text-sm text-ivory outline-none">
          {error}
        </p>
      ))}
      {state.notice ? <p className="text-sm text-silver">{state.notice}</p> : null}
      <label className="block text-sm text-ivory">
        Email
        <input className={mobileCheckoutFieldClass} name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block text-sm text-ivory">
        Password
        <input className={mobileCheckoutFieldClass} name="password" type="password" autoComplete="current-password" minLength={12} required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : submitLabel}
      </Button>
    </form>
  );
}
