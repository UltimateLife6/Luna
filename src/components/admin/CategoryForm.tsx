"use client";

import { useActionState } from "react";
import { createCategoryAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

const initialState: FormState = { errors: [] };
const fieldClass = "mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory";

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategoryAction, initialState);

  return (
    <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
      {state.errors.length > 0 ? (
        <p role="alert" className="border border-burgundy px-4 py-3 text-sm text-ivory sm:col-span-2">
          {state.errors.join(" ")}
        </p>
      ) : null}
      <label className="block text-sm text-ivory">
        Name
        <input className={fieldClass} name="name" required maxLength={80} />
      </label>
      <label className="block text-sm text-ivory">
        Slug
        <input className={fieldClass} name="slug" maxLength={80} placeholder="Generated from the name if empty" />
      </label>
      <label className="block text-sm text-ivory sm:col-span-2">
        Description
        <input className={fieldClass} name="description" maxLength={240} />
      </label>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
