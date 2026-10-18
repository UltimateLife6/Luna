"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { useAlertFocus } from "@/components/ui/useAlertFocus";

const initialState: FormState = { errors: [] };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const alertRef = useAlertFocus(state.errors);

  return (
    <form action={action} className="max-w-md space-y-6">
      {state.errors.length > 0 ? (
        <p ref={alertRef} tabIndex={-1} role="alert" className="border border-burgundy px-4 py-3 text-sm text-ivory outline-none">
          {state.errors[0]}
        </p>
      ) : null}
      <label className="block text-sm text-ivory">
        Email
        <input className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="block text-sm text-ivory">
        Password
        <input className="mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory" type="password" name="password" autoComplete="current-password" required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking" : "Enter admin"}
      </Button>
    </form>
  );
}
