"use client";

import { useActionState } from "react";
import { savePolicyAction, type FormState } from "@/app/admin/policy-actions";
import { Button } from "@/components/ui/Button";

const initialState: FormState = { errors: [] };

export function PolicyForm({ slug, body, published }: { slug: string; body: string; published: boolean }) {
  const [state, action, pending] = useActionState(savePolicyAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {state.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-ivory">
          {error}
        </p>
      ))}
      <label className="block text-sm text-ivory">
        Policy text
        <textarea className="mt-2 min-h-48 w-full border border-ivory/20 bg-transparent px-3 py-3 text-base text-ivory sm:text-sm" name="body" defaultValue={body} />
      </label>
      <label className="flex min-h-12 items-center gap-3 text-sm text-ivory">
        <input type="checkbox" name="publish" value="1" defaultChecked={published} />
        Publish this text
      </label>
      <p className="text-sm text-silver">An empty policy stays unpublished. This form does not supply the text.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save policy"}
      </Button>
    </form>
  );
}
